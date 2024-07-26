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
      let userRef = ref(db, `offices/${id}`);
      let unsubscriber = onValue(userRef, (snapshot) => {
        const userData = snapshot.val();
        if (userData && userData.id === uid) {
          requestPermissions(
            document.getElementById("permissions"),
            document.getElementById("main-content"),
            id + " monitor",
            "Gates-OH",
            "Setup office!"
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
        unsubscriber();
        await displayUserVideo(visitorId, document.getElementById("visitor-video-container"));
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
          visitorName = user.displayName;
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
    const progressRef = ref(db, `users/${user_id}/interactionProgress`);
    onValue(progressRef, (snapshot) => {
      const data = snapshot.val();
      output.innerHTML = data;
      document.getElementById("my-video-container").style.filter = `blur(${20 - data / 5}px)`;
      playUserAudio(user_id, data);
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
            visitLog.displayName
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
