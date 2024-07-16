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
import { displayUserVideo, playUserAudio, requestPermissions } from "./zoom-sdk.js";

let tokens = window.location.pathname.split("/");
let id = tokens[tokens.length - 2];

console.log("id", id);

document.addEventListener("DOMContentLoaded", function () {
  // Start Zoom video stream
  const acceptPermissionsEvent = requestPermissions(
    document.getElementById("permissions"),
    document.getElementById("main-content"),
    id + " monitor",
    "Gates-OH",
    "Accept permissions"
  );
});

document.addEventListener("AcceptedPermissions", function () {
  const db = getDatabase(app);

  const audio = new Audio("../../soft-ding.mp3");

  // Get the entry from the offices table where urlid = id
  const officeRef = ref(db, `offices/${id}`);

  let visitorId = null;
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
      visitorId = office.currentVisitorId;

      // Check if there is no current visitor
      if (!office.currentVisitorId) {
        if (unsubscriber) unsubscriber();

        let visitLog = await generateVisitLog(document.getElementById("label"));
        console.log("VisitLog: ", visitLog);

        document.getElementById("label").classList.remove("monitor-large");
        visitorId = null; // Clear the visitorId
        document.getElementById("my-video-container").classList.add("monitor-video-hidden");
        document.getElementById("visitor-video-container").innerHTML = "";
        return;
      } else {
        visitorId = office.currentVisitorId;
        unsubscriber = updateCurrentUser(visitorId, unsubscriber);
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
    console.log("user id", user_id);
    return onValue(
      userRef,
      (snapshot) => {
        const data = snapshot.val();
        const user = data;
        console.log("changing user data with new user", user);

        document.getElementById("label").textContent = user.preferredName + " is here.";
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

          const dayDescriptor = isToday
            ? "today"
            : visitTime.toLocaleString("en-US", { weekday: "long" });

          const sentence = `${visitLog.preferredName} ${getRandomWord(
            wordOptions
          )} ${dayDescriptor} at ${formattedTime}.`;
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
