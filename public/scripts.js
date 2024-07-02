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

import KJUR from "jsrsasign";

import ZoomVideo from "@zoom/videosdk";
const RESOLUTION = { width: 1280, height: 720 };
const sdkKey = process.env.ZOOM_SDK_KEY;
const sdkSecret = process.env.ZOOM_SDK_SECRET;
const client = ZoomVideo.createClient();

const people = [];

function renderPeople() {
  const peopleContainer = document.getElementById("rows");
  peopleContainer.innerHTML = "";

  const auth = getAuth(app);
  let uid = null;
  const user = auth.currentUser;
  if (user) {
    uid = user.uid;
  }

  people.forEach((person) => {
    const person_uid = person["user-id"];

    if (person_uid === uid) {
      console.log("Skipping current user");
      return;
    }
    const personDiv = document.createElement("div");
    personDiv.classList.add("person");

    const nameHeading = document.createElement("h3");
    nameHeading.textContent = person.name;

    const roomParagraph = document.createElement("p");
    roomParagraph.textContent = person.room;

    const indicatorDiv = document.createElement("div");
    indicatorDiv.classList.add("indicator");
    if (person.available) {
      indicatorDiv.classList.add("available");
    }
    const spacer = document.createElement("div");
    spacer.classList.add("spacer");

    personDiv.appendChild(nameHeading);
    personDiv.appendChild(roomParagraph);
    personDiv.appendChild(spacer);
    personDiv.appendChild(indicatorDiv);

    // personDiv.addEventListener("click", () => {
    //   const db = getDatabase();
    //   const personRef = ref(db, `users/user-${person.id}`);
    //   let newAvailability = !person.available;
    //   update(personRef, { available: newAvailability }).then(() => {
    //     console.log("Availability updated!");
    //   });
    // });

    personDiv.id = `person-${person.id}`;

    let outerDiv = document.createElement("div");

    outerDiv.classList.add("person-container");
    outerDiv.appendChild(personDiv);

    let videoDiv = document.createElement("div");
    videoDiv.classList.add("video-container");
    outerDiv.appendChild(videoDiv);

    if (person.available) {
      outerDiv.classList.add("expandable");
      videoDiv.addEventListener("mouseover", () => {
        // connectToVideo(person, videoDiv);
      });
      videoDiv.addEventListener("mouseout", () => {
        // leaveVideo(person, videoDiv);
      });
    }

    peopleContainer.appendChild(outerDiv);
  });
}

function connectToVideo(person, container) {
  // connect to person's video as yourself

  // get current authenticated user
  const auth = getAuth(app);
  let uid = null;
  // get current user's uid without OnAuthStateChanged
  const user = auth.currentUser;
  if (user) {
    uid = user.uid;
  }

  // get user's name from db
  const usersRef = ref(db, "users");
  const userQuery = query(usersRef, orderByChild("user-id"), equalTo(uid));
  get(userQuery)
    .then((snapshot) => {
      if (snapshot.exists()) {
        const userData = snapshot.val();
        const key = Object.keys(userData)[0];
        const username = userData[key].preferredName;
        const sessionName = person.room;
        const sessionPasscode = "";
        container.innerHTML = "Username: " + username + "<br>Room: " + sessionName;
        joinMeeting(username, sessionName, sessionPasscode, container, false);
        console.log("Connected to video");
      }
    })
    .catch((error) => {
      console.error("Error fetching user data:", error);
    });
}

function leaveVideo(person, container) {
  // leave the video
  container.innerHTML = "";
  // client.leave();
}

function updateUserData(data) {
  people.length = 0;
  for (let key in data) {
    people.push(data[key]);
  }
  renderPeople();
}

const db = getDatabase();
const userDataRef = ref(db, "users/");
onValue(
  userDataRef,
  (snapshot) => {
    const data = snapshot.val();
    updateUserData(data);
  },
  (error) => {
    console.error("Failed to read data:", error);
  }
);

console.log("Inside of office");

function updateAvailability(id, available) {
  const personRef = ref(db, `users/${id}`);
  update(personRef, { available }).then(() => {
    console.log("Availability updated!");
  });
}

function onLogout() {
  const usersRef = ref(db, "users");
  const userQuery = query(usersRef, orderByChild("user-id"), equalTo(uid));

  get(userQuery)
    .then((snapshot) => {
      if (snapshot.exists()) {
        console.log("User data:", snapshot.val());
        const userData = snapshot.val();
        const key = Object.keys(userData)[0];

        updateAvailability(userData[key].id, false);
      } else {
        console.log("No user found with the UID:", uid);
      }
    })
    .catch((error) => {
      console.log(uid);
      console.error("Error fetching user data:", error);
    });

  client.leave(true);
}

const auth = getAuth(app);
let uid = null;

onAuthStateChanged(auth, (user) => {
  if (user) {
    uid = user.uid;

    const usersRef = ref(db, "users");
    const userQuery = query(usersRef, orderByChild("user-id"), equalTo(uid));

    get(userQuery)
      .then((snapshot) => {
        if (snapshot.exists()) {
          console.log("User data:", snapshot.val());
          const userData = snapshot.val();
          const key = Object.keys(userData)[0];
          document.getElementById("heading").textContent =
            userData[key].preferredName + "'s Office";

          let videoContainer = document.querySelector("video-player-container");

          joinMeeting(userData[key].preferredName, "Gates-OH", "", videoContainer, true);

          updateAvailability(userData[key].id, true);
        } else {
          console.log("No user found with the UID:", uid);
        }
      })
      .catch((error) => {
        console.log(uid);
        console.error("Error fetching user data:", error);
      });
  } else {
    if (uid) {
      onLogout();
    }
    console.log("User is signed out.");
    window.location.assign("/login.html");
  }
});

window.addEventListener("beforeunload", (event) => {
  if (auth.currentUser) {
    onLogout();
  }
});

function generateJWT(sdkKey, sdkSecret, sessionName, role, sessionKey, userIdentity) {
  const iat = Math.round(new Date().getTime() / 1000) - 30;
  const exp = iat + 60 * 60 * 2;
  const oHeader = { alg: "HS256", typ: "JWT" };

  const oPayload = {
    app_key: sdkKey,
    tpc: sessionName,
    role_type: role,
    session_key: sessionKey,
    user_identity: userIdentity,
    version: 1,
    iat: iat,
    exp: exp,
  };

  const sHeader = JSON.stringify(oHeader);
  const sPayload = JSON.stringify(oPayload);
  const sdkJWT = KJUR.jws.JWS.sign("HS256", sHeader, sPayload, sdkSecret);
  return sdkJWT;
}

// Zoom Integration
function joinMeeting(username, sessionName, sessionPasscode, container, isHost) {
  const jwtToken = generateJWT(
    sdkKey,
    sdkSecret,
    sessionName,
    isHost ? 1 : 0,
    sessionPasscode,
    username
  );

  let stream;

  client
    .init("en-US", "Global", { patchJsMedia: true })
    .then(() => {
      console.log("Joining ", sessionName, " with JWT token:", jwtToken, " as ", username);
      return client.join(sessionName, jwtToken, username, sessionPasscode);
    })
    .then(() => {
      stream = client.getMediaStream();
      return stream.startVideo();
    })
    .then(() => {
      const userId = client.getCurrentUserInfo().userId;
      return stream.attachVideo(userId, RESOLUTION);
    })
    .then((userVideo) => {
      container.appendChild(userVideo);
    })
    .catch((error) => {
      console.error("Error joining meeting:", error);
    });
}
