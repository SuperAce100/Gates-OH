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
  wallCurve,
} from "./curves.js";

let interactionType = "scale";

// get the currently authenticated user's uid
document.addEventListener("DOMContentLoaded", async function () {
  document.getElementById("main-content").style.display = "none";

  document.getElementById("home-button").addEventListener("click", () => {
    leaveOffice();
  });
  const auth = getAuth(app);
  let uid = null;

  let user_id = null;
  let displayName = null;
  let intentionMessage = "";
  let startTime = 0;

  let tokens = window.location.pathname.split("/");
  let id = tokens[tokens.length - 1];

  console.log("id", id);

  const db = getDatabase(app);
  let shouldABTest = false;
  let probability_a = 1;

  let timeGraph = {};

  const globalRef = ref(db, "globalValues");
  onValue(globalRef, (snapshot) => {
    const data = snapshot.val();
    interactionType = data.interactionType;
    shouldABTest = data.shouldABTest;
    probability_a = data.probability_a;
  });
  const isGroupA = Math.random() < probability_a && shouldABTest;

  // get the entry from the offices table where urlid = id
  const officeRef = ref(db, `offices/${id}`);
  let officeUnsubscriber = onValue(
    officeRef,
    (snapshot) => {
      const data = snapshot.val();
      console.log("data", data);
      const office = data;
      console.log("office", office);
      document.title = office.name;
      document.getElementById("heading").textContent = office.name;
      if (!office.doorOpen || office.currentVisitorId) {
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
              user.displayName == null,
              true
            );
            document.addEventListener("AcceptedPermissions", async function (e) {
              const audio = new Audio("../../door-knock.mp3");
              const whitenoise = new Audio("../../white-noise.mp3");
              let fadeOutDuration = 5000; // 7 seconds in milliseconds
              let fadeOutInterval = 50; // Interval for fading out
              let isPlaying = false;
              let fadeOutTimer;

              startTime = new Date().getTime();

              function startAudio() {
                whitenoise.currentTime = 0;
                whitenoise.play();
                isPlaying = true;
                fadeOutAudio();
              }

              function restartAudio() {
                clearTimeout(fadeOutTimer);
                whitenoise.currentTime = 0;
                whitenoise.play();
                fadeOutAudio();
              }

              function fadeOutAudio() {
                let volume = 1.0;
                fadeOutTimer = setTimeout(function fade() {
                  if (volume > 0) {
                    volume -= fadeOutInterval / fadeOutDuration;
                    if (volume < 0) volume = 0;
                    whitenoise.volume = volume;
                    setTimeout(fade, fadeOutInterval);
                  } else {
                    whitenoise.pause();
                    isPlaying = false;
                  }
                }, fadeOutInterval);
              }

              const loaderContainer = document.createElement("div");
              loaderContainer.className = "loader-container";
              const loader = document.createElement("div");
              loader.className = "loader";
              const loadingText = document.createElement("p");
              loadingText.textContent = "Loading...";
              loaderContainer.appendChild(loader);
              loaderContainer.appendChild(loadingText);

              document.getElementById("visitor-page").appendChild(loaderContainer);
              document.getElementById("main-content").style.opacity = 0;

              const curvesRef = ref(db, `globalValues/curves`);
              let curves = (await get(curvesRef)).val();
              onValue(curvesRef, (snapshot) => {
                const data = snapshot.val();
                curves = data;
              });

              const scrollOverlay = document.getElementById("scroll-overlay");
              const userRef = ref(db, `users/${uid}`);

              const updateScrollPosition = () => {
                if (isGroupA) {
                  // console.log("User is in no-interaction group!");
                  update(userRef, { interactionProgress: 100 });
                  return;
                }
                const maxScrollTop = scrollOverlay.scrollHeight - scrollOverlay.clientHeight;
                const scrollPosition = scrollOverlay.scrollTop;
                let scrollPercentage = 0;
                if (maxScrollTop !== 0) {
                  scrollPercentage = Math.min(100, (scrollPosition / maxScrollTop) * 100);
                }
                update(userRef, { interactionProgress: scrollPercentage });
              };

              // Attach the update function to the scroll event

              const progressRef = ref(db, `users/${uid}/interactionProgress`);
              intentionMessage = e.detail.message;
              console.log("intentionMessage", intentionMessage);
              displayName = e.detail.username;

              await joinOffice();

              setTimeout(() => {
                if (isGroupA) {
                  console.log("User is in no-interaction group!");
                  updateScrollPosition();
                }

                // startAudio();
                document.getElementById("visitor-page").removeChild(loaderContainer);

                document.getElementById(
                  "hallcam-video-container"
                ).style.transform = `translateX(${translationXCurve(
                  0,
                  curves
                )}%) translateY(${translationYCurve(0, curves)}%) scale(${scaleCurve(0, curves)}) `;
                document.getElementById(
                  "wall"
                ).style.transform = `translateX(-50%) translateY(-50%) scale(${wallCurve(
                  0,
                  curves
                )}) `;

                document.getElementById("main-content").style.opacity = 1;

                scrollOverlay.onscroll = updateScrollPosition;

                let mostRecentData = 0;
                let timeGraphStart = new Date().getTime();
                setInterval(() => {
                  const timeFromStart = new Date().getTime() - timeGraphStart;
                  timeGraph[timeFromStart] = mostRecentData;
                }, 500);

                onValue(progressRef, async (snapshot) => {
                  const data = snapshot.val();
                  mostRecentData = data;

                  document.getElementById(
                    "hallcam-video-container"
                  ).style.filter = `blur(${blurCurve(data, curves)}px)`;

                  if (data < 30) {
                    document.getElementById("visitor-tutorial").children[0].textContent =
                      "Scroll down to move closer";
                  } else {
                    document.getElementById("visitor-tutorial").children[0].textContent =
                      "Audio enabled, feel free to talk";
                  }

                  document.getElementById("visitor-tutorial").style.opacity = `${tutorialCurve(
                    data,
                    curves
                  )}`;

                  document.getElementById("progress-inner").style.height = `${data}%`;
                  playUserAudio(id + " monitor", officeCurve(data, curves));

                  if (19 < data && data < 21) {
                    if (!isPlaying) {
                      startAudio();
                    } else {
                      restartAudio();
                    }
                  }

                  document.getElementById(
                    "hallcam-video-container"
                  ).style.transform = ` translateX(${translationXCurve(
                    data,
                    curves
                  )}%) translateY(${translationYCurve(data, curves)}%) scale(${scaleCurve(
                    data,
                    curves
                  )}) `;
                  document.getElementById(
                    "wall"
                  ).style.transform = ` translateX(-50%) translateY(-50%) scale(${wallCurve(
                    data,
                    curves
                  )})`;
                });
              }, 4000);

              unsubscriber();
              if (displayName) {
                update(userRef, { displayName: displayName });
              }

              document
                .getElementById("preview-video-container")
                .classList.remove("preview-video-hidden");
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
    const currentTime = new Date().getTime();

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
      intention: intentionMessage,
    };
    update(visitLogRef, { [currentTime.toString()]: visitData }).then(() => {
      console.log("Visit log updated!");
    });

    // document.getElementById("hallcam-container").style.display = "none";
    await displayUserVideo(id + " monitor", document.getElementById("hallcam-video"));
    await displayUserVideo(user_id, document.getElementById("preview-video"));
    console.log("User video displayed!");
    // document.getElementById("hallcam-container").style.display = "block";

    const officeRef = ref(db, `offices/${id}`);
    officeUnsubscriber();
    update(officeRef, {
      currentVisitorId: user_id,
      currentVisitorName: displayName,
      currentVisitorIntention: intentionMessage,
    }).then(() => {
      console.log("Current visitor updated!");
    });

    // make the user's currentOffice equal to the office's id using the snapshot
    const currentUserRef = ref(db, `users/${user_id}`);
    update(currentUserRef, { currentOffice: id }).then(() => {
      console.log("Current office updated!");
    });
  }

  function generateFeedbackForm() {
    // Create the feedback form elements dynamically
    const feedbackForm = document.createElement("div");
    feedbackForm.classList.add("container");
    feedbackForm.classList.add("glass");
    feedbackForm.classList.add("feedback-form");

    const formTitle = document.createElement("h2");
    formTitle.textContent = "Tell us what you think";

    const formElement = document.createElement("form");
    formElement.id = "feedbackForm";

    const starRatingDiv = document.createElement("div");
    starRatingDiv.classList.add("star-rating");

    // Create star rating inputs and labels
    for (let i = 5; i >= 1; i--) {
      const input = document.createElement("input");
      input.type = "radio";
      input.id = "star" + i;
      input.name = "rating";
      input.value = i;

      const label = document.createElement("label");
      label.htmlFor = "star" + i;
      label.textContent = "★";

      starRatingDiv.appendChild(input);
      starRatingDiv.appendChild(label);
    }

    const label = document.createElement("label");
    label.htmlFor = "comments";
    label.textContent =
      "What about the interaction was intimidating? What was comfortable? Would you use it again?";

    const commentsTextarea = document.createElement("textarea");
    commentsTextarea.name = "comments";
    commentsTextarea.id = "comments";
    commentsTextarea.classList.add("glass");
    commentsTextarea.placeholder = "";

    const submitButton = document.createElement("button");
    submitButton.type = "submit";
    submitButton.classList.add("glass-button");
    submitButton.textContent = "Submit";

    // Append all created elements to the form
    formElement.appendChild(starRatingDiv);
    formElement.appendChild(label);
    formElement.appendChild(commentsTextarea);
    formElement.appendChild(submitButton);

    // Append the form and title to the feedback form container
    feedbackForm.appendChild(formTitle);
    feedbackForm.appendChild(formElement);

    // Append the feedback form to the main-content div
    document.getElementById("main-content").appendChild(feedbackForm);

    // Add form submission handler
    formElement.addEventListener("submit", async function (e) {
      e.preventDefault(); // Prevent the form from submitting the traditional way

      const rating = document.querySelector('input[name="rating"]:checked')?.value;
      const comments = document.getElementById("comments").value;

      console.log("Rating:", rating);
      console.log("Comments:", comments);

      if (!displayName) {
        const userRef = ref(db, `users/${user_id}`);
        const userSnapshot = await get(userRef);
        const userData = userSnapshot.val();
        displayName = userData.displayName;
      }

      alert("Thank you for your feedback!");

      const feedbackRef = ref(db, `feedback`);
      const feedbackData = {
        rating: rating,
        comments: comments,
        submit_time: new Date().toLocaleString(),
        time_spent: Math.floor((new Date().getTime() - startTime) / 1000),
        office_visited: id,
        user_id: user_id,
        isGroupA: isGroupA,
        timeGraph: timeGraph,
        displayName: displayName ? displayName : "Display name not found",
      };
      await update(feedbackRef, { [new Date().getTime().toString()]: feedbackData });

      window.location.href = "/";
    });
  }

  async function leaveOffice() {
    const officeRef = ref(db, `offices/${id}`);
    update(officeRef, {
      currentVisitorId: null,
      currentVisitorName: null,
      currentVisitorIntention: null,
    }).then(() => {
      console.log("Current visitor cleared!");
      // stop animation?
    });

    const currentUserRef = ref(db, `users/${user_id}`);
    update(currentUserRef, { currentOffice: null, interactionProgress: null }).then(() => {
      console.log("Current office cleared!");
    });

    leaveMeeting(document.getElementById("preview-video-container"));

    document.getElementById("main-content").innerHTML = "";
    document.getElementById("main-content").style.display = "block";

    generateFeedbackForm();
  }

  window.addEventListener("beforeunload", async () => {
    leaveOffice();
  });
});
