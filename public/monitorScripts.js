import app from "./firebase-config.js";
import {
  getDatabase,
  ref,
  onValue,
  update,
  query,
  orderByChild,
  equalTo,
  limitToLast,
  get,
} from "firebase/database";
import {
  displayUserVideo,
  leaveMeeting,
  playUserAudio,
  requestPermissions,
  muteAllUsersAudio,
} from "./zoom-sdk.js";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  ambienceCurve,
  blurCurve,
  officeCurve,
  scaleCurve,
  translationXCurve,
  translationYCurve,
} from "./curves.js";

let tokens = window.location.pathname.split("/");
let id = tokens[tokens.length - 2];

console.log("id", id);

const db = getDatabase(app);
const auth = getAuth(app);

document.addEventListener("DOMContentLoaded", function () {
  auth.onAuthStateChanged((currentUser) => {
    // Get the currently authenticated user's uid
    let uid = null;
    if (currentUser) {
      uid = currentUser.uid;
      console.log("User: ", currentUser);
      console.log("UID: ", uid);
      let userRef = ref(db, `offices/${id}`);
      let unsubscriber = onValue(userRef, (snapshot) => {
        const userData = snapshot.val();
        if (userData && userData.id === uid) {
          requestPermissions(
            document.getElementById("permissions"),
            document.getElementById("main-content"),
            id + " monitor",
            "Gates-OH",
            "Start virtual office!"
          );
          unsubscriber();
        } else {
          console.error("No user data found.");
          window.location.href = `/offices/login`;
        }
      });
    } else {
      console.log("No user is signed in.");
      window.location.href = `/login`;
    }
  });
});

document.addEventListener("AcceptedPermissions", async function () {
  const audio = new Audio("../../door-knock.mp3");

  // Get the entry from the offices table where urlid = id
  const officeRef = ref(db, `offices/${id}`);

  let visitorId = null;
  let visitorName = null;
  let visitorMessage = null;
  let unsubscriber = null;

  let interactionType = null;
  const globalRef = ref(db, "globalValues");
  onValue(globalRef, (snapshot) => {
    const data = snapshot.val();
    interactionType = data.interactionType;
  });

  displayUserVideo(id + " monitor", document.getElementById("preview-video"), true);

  await update(officeRef, { doorOpen: true });

  onValue(
    officeRef,
    async (snapshot) => {
      const data = snapshot.val();
      const office = data;
      console.log("office", office);
      document.getElementById("location").textContent = office.name;
      console.log("Current Visitor: ", office.currentVisitorId);
      console.log("Current Visitor Name: ", office.currentVisitorName);

      visitorId = office.currentVisitorId;
      visitorName = office.currentVisitorName;
      visitorMessage = office.currentVisitorIntention;
      const whitenoise = new Audio("../../white-noise.mp3");

      // Check if there is no current visitor
      if (!office.currentVisitorId) {
        if (unsubscriber) unsubscriber();
        muteAllUsersAudio();
        whitenoise.pause();

        let visitLog = await generateVisitLog(document.getElementById("label"));
        console.log("VisitLog: ", visitLog);

        document.getElementById("label").classList.remove("monitor-large");
        visitorId = null; // Clear the visitorId
        document.getElementById("my-video-container").classList.add("monitor-video-hidden");
        document.getElementById("visitor-video-container").innerHTML = "";
        return;
      } else {
        const curvesRef = ref(db, `globalValues/curves`);
        let curves = (await get(curvesRef)).val();
        onValue(curvesRef, (snapshot) => {
          const data = snapshot.val();
          curves = data;
        });

        visitorId = office.currentVisitorId;
        visitorName = office.currentVisitorName;

        document.getElementById("my-video-container").classList.remove("monitor-video-hidden");

        unsubscriber = await updateCurrentUser(visitorId, curves, whitenoise);

        await displayUserVideo(visitorId, document.getElementById("visitor-video-container"));

        // unsubscriber();
      }
    },
    (error) => {
      console.error("Error reading data:", error);
    }
  );

  async function updateCurrentUser(user_id, curves, whitenoise) {
    const userRef = ref(db, `users/${user_id}/displayName`);
    console.log("user ", visitorName);
    whitenoise.volume = ambienceCurve(0, curves);

    whitenoise.play();
    // setTimeout(() => {
    //   whitenoise.pause();
    // }, 9000);

    return onValue(
      userRef,
      (snapshot) => {
        const data = snapshot.val();
        const displayName = data;
        if (displayName) {
          visitorName = displayName;
        }
        console.log("changing user data with new user", displayName);
        document.getElementById("monitor-video-supercontainer").style.opacity = 0;

        document.getElementById("my-video-container").style.transform = `scale(${scaleCurve(
          100,
          curves
        )}) translateX(${translationXCurve(0, curves)}%) translateY(${translationYCurve(
          0,
          curves
        )}%)`;
        console.log(
          `scale(${scaleCurve(0, curves)}) translateX(${translationXCurve(
            0,
            curves
          )}%) translateY(${translationYCurve(0, curves)}%)`
        );
        document.getElementById("my-video-container").style.filter = `blur(${blurCurve(
          0,
          curves
        )}px)`;

        switch (visitorMessage.toLowerCase()) {
          case "just need 1 minute":
            document.getElementById("label").textContent = visitorName + " just needs a minute.";
            break;
          case "waiting":
            document.getElementById("label").textContent = visitorName + " is waiting.";
            break;
          case "want to chat":
            document.getElementById("label").textContent = visitorName + " wants to chat.";
            break;
          default:
            document.getElementById("label").textContent = visitorName;
        }
        document.getElementById("label").classList.add("monitor-large");

        const progressRef = ref(db, `users/${user_id}/interactionProgress`);
        setTimeout(() => {
          onValue(progressRef, async (snapshot) => {
            const data = snapshot.val();
            document.getElementById("my-video-container").style.filter = `blur(50px)`;
            document.getElementById("my-video-container").style.filter = `blur(${blurCurve(
              data,
              curves
            )}px)`;
            playUserAudio(user_id, officeCurve(data, curves));
            whitenoise.volume = ambienceCurve(data, curves);
            document.getElementById("my-video-container").style.transform = `scale(${scaleCurve(
              data,
              curves
            )}) translateX(${translationXCurve(data, curves)}%) translateY(${translationYCurve(
              data,
              curves
            )}%)`;
          });
          setTimeout(() => {
            document.getElementById("monitor-video-supercontainer").style.opacity = 1;
          }, 100);
        }, 4000);
      },
      (error) => {
        console.error("Error reading data:", error);
      }
    );
  }

  async function generateVisitLog(container) {
    let wordOptions = [
      "dropped by",
      "visited",
      "stopped by",
      "came over",
      "arrived",
      "showed up",
      "swung by",
      "popped in",
      "checked in",
      "made an appearance",
      "passed by",
    ];

    function getRandomWord(wordOptions) {
      return wordOptions[Math.floor(Math.random() * wordOptions.length)];
    }

    let length = 5;
    let startingOpacity = 0.1;
    let step = (1 - startingOpacity) / (length - 1);

    const visitLogRef = ref(db, `offices/${id}/visitLog`);
    const queryRef = query(visitLogRef, orderByChild("time"), limitToLast(length));

    // Set up a real-time listener
    onValue(queryRef, (snapshot) => {
      try {
        const visitLogs = snapshot.val();
        let sentences = [];
        let index = 0;
        for (const key in visitLogs) {
          const visitLog = visitLogs[key];
          const visitTime = new Date(visitLog.time);
          const now = new Date();

          const isToday =
            visitTime.getDate() === now.getDate() &&
            visitTime.getMonth() === now.getMonth() &&
            visitTime.getFullYear() === now.getFullYear();

          const formattedTime = visitTime.toLocaleString("en-US", {
            hour: "numeric",
            minute: "numeric",
          });

          let intentionMessage = "";

          switch (visitLog.intention.toLowerCase()) {
            case "just need 1 minute":
              intentionMessage = " needed a minute on ";
              break;
            case "waiting":
              intentionMessage = " was waiting on ";
              break;

            default:
              intentionMessage = "";
          }

          const dayDescriptor = isToday
            ? "today"
            : visitTime.toLocaleString("en-US", { weekday: "long" });

          const sentence = `<span style="opacity: ${
            1 - step * (length - 1 - index)
          }"><p class="monitor-name" id="visitlog-${index}">${
            visitLog.displayName
          }</p> <p class="monitor-time">${dayDescriptor} at ${formattedTime}</p></span>`;
          sentences.unshift(sentence);
          index++;
        }

        const result = sentences.join("<br>");
        console.log(result);
        container.innerHTML = result;
      } catch (error) {
        console.error("Error reading visit log:", error);
      }
    });
  }

  function initializeAudio() {
    audio.play().catch(() => {
      console.log("Audio playback not allowed until user interaction.");
    });
  }

  document.addEventListener("click", initializeAudio, { once: true });
});

async function closeOffice() {
  const officeRef = ref(db, `offices/${id}`);
  update(officeRef, { doorOpen: false });
  leaveMeeting(document.getElementById("preview-video"));
}

document.getElementById("close-button").addEventListener("click", function () {
  closeOffice();
  window.location.href = `/logout`;
});

document.addEventListener("beforeunload", async function () {
  closeOffice();
  console.log("Unloading page");
});
