import app from "./firebase-config.js";
import { getDatabase, ref, onValue, update, query, orderByChild, equalTo } from "firebase/database";
import { getAuth } from "firebase/auth";
import { displayUserVideo, leaveMeeting, playUserAudio, requestPermissions } from "./zoom-sdk.js";

let interactionType = "scale";

// get the currently authenticated user's uid
document.addEventListener("DOMContentLoaded", async function () {
  document.getElementById("main-content").style.display = "none";

  document.getElementById("home-button").addEventListener("click", () => {
    window.location.href = "/";
  });
  const auth = getAuth(app);
  let uid = null;
  const user = auth.currentUser;
  if (user) {
    uid = user.uid;
  }

  let user_id = null;

  let tokens = window.location.pathname.split("/");
  let id = tokens[tokens.length - 2];

  console.log("id", id);

  const db = getDatabase(app);

  const globalRef = ref(db, "globalValues");
  onValue(globalRef, (snapshot) => {
    const data = snapshot.val();
    interactionType = data.interactionType;
  });

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
        let message =
          "You are about to enter " +
          document.getElementById("heading").textContent +
          ". Click to confirm your video and audio permissions.";
        const acceptPermissionsEvent = requestPermissions(
          document.getElementById("permissions"),
          document.getElementById("main-content"),
          user_id,
          "Gates-OH",
          message
        );
        document.addEventListener("AcceptedPermissions", async function () {
          await joinOffice();
          runInteraction();
        });
      }
    },
    (error) => {
      console.error("Error reading data:", error);
    }
  );

  async function joinOffice() {
    document.getElementById("hallcam-container").style.display = "none";
    await displayUserVideo(id, document.getElementById("hallcam-video"));
    await displayUserVideo(user_id, document.getElementById("preview-video"));
    document.getElementById("hallcam-container").style.display = "block";

    const officeRef = ref(db, `offices/${id}`);
    update(officeRef, { currentVisitorId: user_id }).then(() => {
      console.log("Current visitor updated!");
    });

    // make the user's currentOffice equal to the office's id using the snapshot
    const currentUserRef = ref(db, `users/${user_id}`);
    update(currentUserRef, { currentOffice: id }).then(() => {
      console.log("Current office updated!");
    });
  }

  function runInteraction() {
    document
      .getElementById("hallcam-video-container")
      .classList.add("animate-dropin-" + interactionType);
    document
      .getElementById("hallcam-video-container")
      .addEventListener("animationend", function () {
        this.classList.remove("animate-dropin-" + interactionType);
      });

    document.getElementById("preview-video-container").classList.remove("preview-video-hidden");
    // const duration = 5000; // 5 seconds
    // const interval = 100; // 100 milliseconds
    // const steps = duration / interval;
    // const stepSize = 100 / steps;
    // let currentVolume = 0;
    // const volumeInterval = setInterval(() => {
    //   currentVolume += stepSize;
    //   playUserAudio(id, currentVolume / 100);
    //   if (currentVolume >= 100) {
    //     clearInterval(volumeInterval);
    //   }
    // }, interval);
  }

  async function leaveOffice() {
    const officeRef = ref(db, `offices/${id}`);
    update(officeRef, { currentVisitorId: null }).then(() => {
      console.log("Current visitor cleared!");
      // stop animation?
    });

    const currentUserRef = ref(db, `users/${user_id}`);
    update(currentUserRef, { currentOffice: null }).then(() => {
      console.log("Current office cleared!");
    });

    leaveMeeting(document.getElementById("preview-video-container"));
  }

  window.addEventListener("beforeunload", async () => {
    leaveOffice();
  });
});
