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

let tokens = window.location.pathname.split("/");
let id = tokens[tokens.length - 2];

console.log("id", id);

const db = getDatabase(app);

const audio = new Audio("../../soft-ding.mp3");

// Get the entry from the offices table where urlid = id
const officeRef = ref(db, `offices/${id}`);

let visitorId = null;
let unsubscriber = null;
let timerInterval = null;
let startTime = null;

onValue(
  officeRef,
  (snapshot) => {
    const data = snapshot.val();
    const office = data;
    console.log("office", office);
    document.getElementById("location").textContent = office.name;
    console.log("Current Visitor: ", office.currentVisitorId);
    visitorId = office.currentVisitorId;

    // Check if there is no current visitor
    if (!office.currentVisitorId) {
      if (unsubscriber) unsubscriber();
      stopTimer();
      console.log("No one is currently visiting.");
      document.getElementById("label").textContent = "No one is currently visiting.";
      document.getElementById("label").classList.remove("monitor-large");
      visitorId = null; // Clear the visitorId
      return;
    } else {
      visitorId = office.currentVisitorId;
      unsubscriber = updateCurrentUser(visitorId, unsubscriber);
      startTimer(); // Start the timer when someone joins
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

      document.getElementById("label").textContent = user.preferredName + " is currently visiting.";
      document.getElementById("label").classList.add("monitor-large");
      audio.play();
    },
    (error) => {
      console.error("Error reading data:", error);
    }
  );
}

function startTimer() {
  if (timerInterval) clearInterval(timerInterval);
  startTime = Date.now();
  timerInterval = setInterval(() => {
    console.log(`Time elapsed: ${getTimeSeconds()} seconds`);
  }, 1000);
}

function stopTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = null;
  startTime = null;
}

function getTimeSeconds() {
  if (!startTime) return 0;
  let elapsedTime = Date.now() - startTime;
  return Math.floor(elapsedTime / 1000);
}

function initializeAudio() {
  audio.play().catch(() => {
    console.log("Audio playback not allowed until user interaction.");
  });
}

document.addEventListener("click", initializeAudio, { once: true });

// Ensure the button initializes the audio context
document.getElementById("enableSoundButton").addEventListener("click", initializeAudio);
