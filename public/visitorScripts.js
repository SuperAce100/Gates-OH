import app from "./firebase-config.js";
import {
  getDatabase,
  ref,
  onValue,
  update,
  query,
  orderByChild,
  equalTo,
  get,
} from "firebase/database";
import { getAuth, onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { displayUserVideo, leaveMeeting, playUserAudio, requestPermissions } from "./zoom-sdk.js";
import {
  blurCurve,
  officeCurve,
  tutorialCurve,
  ambienceCurve,
  scaleCurve,
  translationXCurve,
  translationYCurve,
} from "./curves.js";
import { on } from "process";
import { doc } from "firebase/firestore";

let interactionType = "scale";

// get the currently authenticated user's uid
document.addEventListener("DOMContentLoaded", async function () {
  document.getElementById("main-content").style.display = "none";

  document.getElementById("home-button").addEventListener("click", () => {
    window.location.href = "/";
  });
  const auth = getAuth(app);
  let uid = null;

  let user_id = null;
  let displayName = null;

  let tokens = window.location.pathname.split("/");
  let id = tokens[tokens.length - 1];

  console.log("id", id);

  const db = getDatabase(app);

  const globalRef = ref(db, "globalValues");
  onValue(globalRef, (snapshot) => {
    const data = snapshot.val();
    interactionType = data.interactionType;
  });

  // get the entry from the offices table where urlid = id
  const officeRef = ref(db, `offices/${id}`);
  onValue(
    officeRef,
    (snapshot) => {
      const data = snapshot.val();
      console.log("data", data);
      const office = data;
      console.log("office", office);
      document.title = office.name;
      document.getElementById("heading").textContent = office.name;
      if (!office.doorOpen) {
        document.getElementById(
          "main-content"
        ).innerHTML = `<h1>${office.name}'s door is closed.</h1><p>Redirecting to home...</p>`;
        document.getElementById("main-content").style.display = "block";
        setTimeout(() => {
          window.location.href = "/";
        }, 3000);
      }
    },
    (error) => {
      console.error("Error reading data:", error);
    }
  );

  auth.onAuthStateChanged((currentUser) => {
    if (currentUser) {
      uid = currentUser.uid;
      console.log("User: ", currentUser);
      console.log("UID: ", uid);
      const userRef = ref(db, `users/${uid}`);
      const unsubscriber = onValue(
        userRef,
        (snapshot) => {
          const data = snapshot.val();
          console.log("data", data);
          const user = data;
          console.log("user", user);

          if (!user) {
            update(userRef, { id: uid }).then(() => {
              console.log("User added to database with id:", uid);
              return;
            });
          }

          user_id = user.id;
          displayName = user.displayName ? user.displayName : null;

          if (user.currentOffice) {
            console.log("leaving office!");
            unsubscriber();
          } else {
            let message = "Drop by " + document.getElementById("heading").textContent;
            requestPermissions(
              document.getElementById("permissions"),
              document.getElementById("main-content"),
              uid,
              "Gates-OH",
              message,
              user.displayName == null
            );
            document.addEventListener("AcceptedPermissions", async function (e) {
              const audio = new Audio("../../door-knock.mp3");
              const whitenoise = new Audio("../../white-noise.mp3");
              whitenoise.loop = true;

              const curvesRef = ref(db, `globalValues/curves`);
              let curves = (await get(curvesRef)).val();
              onValue(curvesRef, (snapshot) => {
                const data = snapshot.val();
                curves = data;
              });

              whitenoise.play();

              const scrollOverlay = document.getElementById("scroll-overlay");
              const userRef = ref(db, `users/${uid}`);

              const updateScrollPosition = () => {
                const maxScrollTop = scrollOverlay.scrollHeight - scrollOverlay.clientHeight;
                const scrollPosition = scrollOverlay.scrollTop;
                let scrollPercentage = 0;
                if (maxScrollTop !== 0) {
                  scrollPercentage = Math.min(100, (scrollPosition / maxScrollTop) * 100);
                }
                update(userRef, { interactionProgress: scrollPercentage });
              };

              // Attach the update function to the scroll event
              scrollOverlay.onscroll = updateScrollPosition;

              const progressRef = ref(db, `users/${uid}/interactionProgress`);
              document.getElementById("hallcam-container").style.display = "none";
              document.getElementById("hallcam-video-container").style.filter = `blur(${blurCurve(
                0,
                curves
              )}px)`;
              whitenoise.volume = ambienceCurve(0, curves);
              document.getElementById(
                "hallcam-video-container"
              ).style.transform = `scale(${scaleCurve(100, curves)}) translateX(${translationXCurve(
                0,
                curves
              )}%) translateY(${translationYCurve(0, curves)}%)`;
              console.log(
                `scale(${scaleCurve(0, curves)}) translateX(${translationXCurve(
                  0,
                  curves
                )}%) translateY(${translationYCurve(0, curves)}%)`
              );

              setTimeout(() => {
                document.getElementById("hallcam-container").style.display = "block";
                onValue(progressRef, async (snapshot) => {
                  const data = snapshot.val();

                  document.getElementById(
                    "hallcam-video-container"
                  ).style.filter = `blur(${blurCurve(data, curves)}px)`;
                  document.getElementById("visitor-tutorial").style.opacity = `${tutorialCurve(
                    data,
                    curves
                  )}`;
                  document.getElementById("progress-inner").style.height = `${data}%`;
                  playUserAudio(id + " monitor", officeCurve(data, curves));
                  whitenoise.volume = ambienceCurve(data, curves);
                  document.getElementById(
                    "hallcam-video-container"
                  ).style.transform = `scale(${scaleCurve(
                    data,
                    curves
                  )}) translateX(${translationXCurve(
                    data,
                    curves
                  )}%) translateY(${translationYCurve(data, curves)}%)`;
                });
              }, 3000);

              displayName = e.detail.username;
              unsubscriber();
              if (displayName) {
                update(userRef, { displayName: displayName });
              }

              await joinOffice();
              runInteraction();
            });
          }
        },
        (error) => {
          console.error("Error reading data:", error);
        }
      );
    } else {
      console.error("No user is signed in.");

      signInAnonymously(auth);
    }
  });

  async function joinOffice() {
    const visitLogRef = ref(db, `offices/${id}/visitLog`);
    const currentTime = new Date().toLocaleString();

    if (!displayName) {
      const userRef = ref(db, `users/${user_id}`);
      const userSnapshot = await get(userRef);
      const userData = userSnapshot.val();
      displayName = userData.displayName;
    }

    const visitData = {
      displayName: displayName,
      id: user_id,
      time: currentTime,
    };
    update(visitLogRef, { [currentTime.replace(/\//g, "-")]: visitData }).then(() => {
      console.log("Visit log updated!");
    });

    document.getElementById("hallcam-container").style.display = "none";
    await displayUserVideo(id + " monitor", document.getElementById("hallcam-video"));
    await displayUserVideo(user_id, document.getElementById("preview-video"));
    document.getElementById("hallcam-container").style.display = "block";

    const officeRef = ref(db, `offices/${id}`);
    update(officeRef, { currentVisitorId: user_id, currentVisitorName: displayName }).then(() => {
      console.log("Current visitor updated!");
    });

    // make the user's currentOffice equal to the office's id using the snapshot
    const currentUserRef = ref(db, `users/${user_id}`);
    update(currentUserRef, { currentOffice: id }).then(() => {
      console.log("Current office updated!");
    });
  }

  function runInteraction() {
    document.getElementById("preview-video-container").classList.remove("preview-video-hidden");
  }

  async function leaveOffice() {
    const officeRef = ref(db, `offices/${id}`);
    update(officeRef, { currentVisitorId: null, currentVisitorName: null }).then(() => {
      console.log("Current visitor cleared!");
      // stop animation?
    });

    const currentUserRef = ref(db, `users/${user_id}`);
    update(currentUserRef, { currentOffice: null, interactionProgress: null }).then(() => {
      console.log("Current office cleared!");
    });

    leaveMeeting(document.getElementById("preview-video-container"));
  }

  window.addEventListener("beforeunload", async () => {
    leaveOffice();
  });
});
