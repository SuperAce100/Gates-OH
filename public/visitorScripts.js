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
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { displayUserVideo, joinMeeting, startCurrentUserVideo } from "./zoom-sdk.js";

document.addEventListener("DOMContentLoaded", function () {
  let tokens = window.location.pathname.split("/");
  let id = tokens[tokens.length - 2];

  console.log("id", id);

  const db = getDatabase(app);

  // get the entry from the offices table where urlid = id
  const officeRef = ref(db, "offices");
  const q = query(officeRef, orderByChild("urlid"), equalTo(id));
  console.log("q", q);
  onValue(
    q,
    (snapshot) => {
      const data = snapshot.val();
      console.log("data", data);
      const office = data[Object.keys(data)[0]];
      console.log("office", office);
      document.getElementById("heading").textContent = office.name;
    },
    (error) => {
      console.error("Error reading data:", error);
    }
  );

  stopTimer();

  // get the currently authenticated user's uid
  const auth = getAuth(app);
  let uid = null;
  const user = auth.currentUser;
  if (user) {
    uid = user.uid;
  }

  let user_id = null;

  // get the entry from the users table where uid is the same as the currently authenticated user
  const userRef = ref(db, "users");
  const userQuery = query(userRef, orderByChild("uid"), equalTo(uid));
  const unsubscriber = onValue(
    userQuery,
    (snapshot) => {
      const data = snapshot.val();
      const user = data[Object.keys(data)[0]];
      console.log("user", user);

      user_id = user.id;
      if (user.currentOffice) {
        console.log("leaving office!");
        unsubscriber();
      } else {
        joinOffice();
      }
    },
    (error) => {
      console.error("Error reading data:", error);
    }
  );

  let timerInterval = null;
  let startTime = null;

  function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    startTime = Date.now();
    let hallcamContainer = document.getElementById("hallcam-container");

    hallcamContainer.style.transform = "scale(1)";
    hallcamContainer.style.transition = "transform 20s linear";
    timerInterval = setInterval(() => {
      const elapsedSeconds = getTimeSeconds();
      // console.log(`Time elapsed: ${elapsedSeconds} seconds`);

      if (elapsedSeconds === 10) {
        tenSeconds();
      }
    }, 1000);
  }

  function stopTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = null;
    startTime = null;
    document.getElementById("preview-video-container").classList.add("preview-video-hidden");
    let hallcamContainer = document.getElementById("hallcam-container");

    hallcamContainer.style.transform = "scale(0)";
    hallcamContainer.style.transition = "transform 0.1s linear";
  }

  function getTimeSeconds() {
    if (!startTime) return 0;
    let elapsedTime = Date.now() - startTime;
    return Math.floor(elapsedTime / 1000);
  }

  function tenSeconds() {
    console.log("10 seconds have elapsed!");
    document.getElementById("preview-video-container").classList.remove("preview-video-hidden");
  }

  function joinOffice() {
    joinMeeting(user_id, "Gates-OH", "", true).then(() => {
      startCurrentUserVideo().then(() => {
        displayUserVideo(user_id, document.getElementById("preview-video"));
      });
      displayUserVideo(id, document.getElementById("hallcam-video"));
    });

    const officeRef = ref(db, `offices/${id}`);
    update(officeRef, { currentVisitorId: user_id }).then(() => {
      console.log("Current visitor updated!");
      startTimer(); // Start the timer when joining the office
    });

    // make the user's currentOffice equal to the office's id using the snapshot
    const currentUserRef = ref(db, `users/${user_id}`);
    update(currentUserRef, { currentOffice: id }).then(() => {
      console.log("Current office updated!");
    });
  }

  async function leaveOffice() {
    const officeRef = ref(db, `offices/${id}`);
    update(officeRef, { currentVisitorId: null }).then(() => {
      console.log("Current visitor cleared!");
      stopTimer(); // Stop the timer when leaving the office
    });

    const currentUserRef = ref(db, `users/${user_id}`);
    update(currentUserRef, { currentOffice: null }).then(() => {
      console.log("Current office cleared!");
    });
  }

  window.addEventListener("beforeunload", async () => {
    leaveOffice();
  });
});
