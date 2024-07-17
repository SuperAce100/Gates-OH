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
      let userRef = ref(db, `users`);
      let q = query(userRef, orderByChild("user-id"), equalTo(uid));
      onValue(q, (snapshot) => {
        const userData = snapshot.val();
        if (userData) {
          const userKey = Object.keys(userData)[0];
          const currentUserID = userData[userKey].id;
          if (currentUserID !== id) {
            window.location.href = `/offices/${id}/visit`;
          } else {
            // Start Zoom video stream
            const acceptPermissionsEvent = requestPermissions(
              document.getElementById("permissions"),
              document.getElementById("main-content"),
              id + " monitor",
              "Gates-OH",
              "Accept permissions"
            );
          }
        } else {
          console.error("No user data found.");
        }
      });
    } else {
      console.log("No user is signed in.");
      window.location.href = `/login`;
    }
  });
});

document.addEventListener("AcceptedPermissions", function () {
  const audio = new Audio("../../soft-ding.mp3");

  // Get the entry from the offices table where urlid = id
  const officeRef = ref(db, `offices/${id}`);

  let visitorId = null;
  let visitorName = null;
  let unsubscriber = null;

  let interactionType = null;
  const globalRef = ref(db, "globalValues");
  onValue(globalRef, (snapshot) => {
    const data = snapshot.val();
    interactionType = data.interactionType;
  });

  displayUserVideo(id + " monitor", document.getElementById("preview-video"), true);

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

      // Check if there is no current visitor
      if (!office.currentVisitorId) {
        if (unsubscriber) unsubscriber();
        muteAllUsersAudio();

        let visitLog = await generateVisitLog(document.getElementById("label"));
        console.log("VisitLog: ", visitLog);

        document.getElementById("label").classList.remove("monitor-large");
        visitorId = null; // Clear the visitorId
        document.getElementById("my-video-container").classList.add("monitor-video-hidden");
        document.getElementById("visitor-video-container").innerHTML = "";
        return;
      } else {
        visitorId = office.currentVisitorId;
        visitorName = office.currentVisitorName;
        unsubscriber = updateCurrentUser(visitorId);
        await displayUserVideo(visitorId, document.getElementById("visitor-video-container"));
        await playUserAudio(visitorId, 100);
        runInteraction();
      }
    },
    (error) => {
      console.error("Error reading data:", error);
    }
  );

  function updateCurrentUser(user_id) {
    const userRef = ref(db, `users/${user_id}`);
    console.log("user ", visitorName);
    return onValue(
      userRef,
      (snapshot) => {
        const data = snapshot.val();
        const user = data;
        if (user) {
          visitorName = user.preferredName;
        }
        console.log("changing user data with new user", user);

        document.getElementById("label").textContent = visitorName + " is here.";
        document.getElementById("label").classList.add("monitor-large");
        audio.play();
      },
      (error) => {
        console.error("Error reading data:", error);
      }
    );
  }

  function runInteraction() {
    document.getElementById("my-video-container").classList.remove("monitor-video-hidden");

    document
      .getElementById("my-video-container")
      .classList.add("animate-dropin-" + interactionType);
    document.getElementById("my-video-container").addEventListener("animationend", function () {
      this.classList.remove("animate-dropin-" + interactionType);
    });
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

    const visitLogRef = ref(db, `offices/${id}/visitLog`);
    const queryRef = query(visitLogRef, orderByChild("time"), limitToLast(5));

    // Set up a real-time listener
    onValue(queryRef, (snapshot) => {
      try {
        const visitLogs = snapshot.val();
        let sentences = [];
        let index = 0;
        for (const key in visitLogs) {
          index++;
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

          const dayDescriptor = isToday
            ? "today"
            : visitTime.toLocaleString("en-US", { weekday: "long" });

          const sentence = `<span style="opacity: ${
            0.4 + 0.15 * index
          }"><p class="monitor-name" id="visitlog-${index}">${
            visitLog.preferredName
          }</p> <p class="monitor-time">${dayDescriptor} at ${formattedTime}.</p></span>`;
          sentences.unshift(sentence);
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

  // Ensure the button initializes the audio context
});

document.addEventListener("beforeunload", function () {
  console.log("Unloading page");
  leaveMeeting(document.getElementById("preview-video"));
});
