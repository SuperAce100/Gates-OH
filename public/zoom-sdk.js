import KJUR from "jsrsasign";
import ZoomVideo from "@zoom/videosdk";
import { getAuth } from "firebase/auth";
import { getDatabase, ref, query, orderByChild, equalTo, get, update } from "firebase/database";
import app from "./firebase-config.js";

const RESOLUTION = { width: 1280, height: 720 };
const sdkKey = process.env.ZOOM_SDK_KEY;
const sdkSecret = process.env.ZOOM_SDK_SECRET;
const client = ZoomVideo.createClient();

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
  return KJUR.jws.JWS.sign("HS256", sHeader, sPayload, sdkSecret);
}

async function joinMeeting(username, sessionName, sessionPasscode, isHost) {
  const jwtToken = generateJWT(
    sdkKey,
    sdkSecret,
    sessionName,
    isHost ? 1 : 0,
    sessionPasscode,
    username
  );

  try {
    await client.init("en-US", "Global", { patchJsMedia: true });
    console.log("Joining ", sessionName, " with JWT token:", jwtToken, " as ", username);
    await client.join(sessionName, jwtToken, username, sessionPasscode);
  } catch (error) {
    console.error("Error joining meeting:", error);
  }
}

async function startCurrentUserVideo() {
  const stream = client.getMediaStream();
  const videoElement = document.createElement("video");
  videoElement.autoplay = true;
  videoElement.muted = true;
  videoElement.setAttribute("playsinline", "true");

  try {
    const userId = client.getCurrentUserInfo().userId;
    await stream.startVideo({
      videoElement: videoElement,
      userId: userId,
    });
    console.log("Current user video started without attaching to DOM");
  } catch (error) {
    console.error("Error starting current user's video:", error);
  }
}

async function displayUserVideo(username, container, isPreview = false) {
  async function attachVideo(user) {
    const stream = client.getMediaStream();
    try {
      const userVideo = await stream.attachVideo(user.userId, RESOLUTION);
      container.appendChild(userVideo);
    } catch (error) {
      console.error("Error connecting to video:", error);
    }
  }

  const users = client.getAllUser();
  const user = users.find((user) => user.displayName === username);

  if (user) {
    container.innerHTML = "";
    console.log("User found:", user.displayName);
    await attachVideo(user);
  } else {
    container.innerHTML = `${username} has not connected`;
  }

  if (!isPreview) {
    client.on("user-added", async (event) => {
      const newUser = event.user;
      if (newUser.displayName === username) {
        console.log(`User joined: ${newUser.displayName}`);
        await attachVideo(newUser);
      }
    });

    // client.on("video-active-change", async (event) => {
    //   const user = client.getAllUser().find((user) => user.userId === event.userId);
    //   if (user && user.displayName === username) {
    //     console.log(`User started video: ${user.displayName}`);
    //     await attachVideo(user);
    //   }
    // });
  }
}

async function detachVideo(username, container) {
  const users = client.getAllUser();
  const user = users.find((user) => user.displayName === username);

  if (user) {
    const stream = client.getMediaStream();
    await stream.detachVideo(user.userId);
    container.innerHTML = `${username} has disconnected`;
  } else {
    container.innerHTML = `${username} has not connected`;
  }
}

function leaveMeeting(container) {
  client
    .leave()
    .then(() => {
      console.log("Left the meeting");
      container.innerHTML = ""; // Clear the video stream container
    })
    .catch((error) => {
      console.error("Error leaving the meeting:", error);
    });
}

async function requestPermissions(container, content) {
  const permissionsForm = document.createElement("div");

  permissionsForm.className = "container glass permissions-form";
  permissionsForm.id = "permissions-form";

  const label = document.createElement("p");
  label.id = "label";
  label.className = "monitor-label";
  label.innerText = "Accept permissions to join meeting";

  const videoContainer = document.createElement("div");
  videoContainer.className = "video";
  videoContainer.id = "permissions-video-container";

  const videoPlayerContainer = document.createElement("video-player-container");
  videoPlayerContainer.id = "permissions-video";

  videoContainer.appendChild(videoPlayerContainer);

  const acceptButton = document.createElement("button");
  acceptButton.id = "accept-permissions-button";
  acceptButton.className = "glass-button denied";
  acceptButton.innerText = "Join!";
  acceptButton.disabled = true;

  permissionsForm.appendChild(label);
  permissionsForm.appendChild(videoContainer);
  permissionsForm.appendChild(acceptButton);

  container.appendChild(permissionsForm);

  const acceptPermissionsEvent = new Event("AcceptedPermissions");

  content.style.display = "none";
  await joinMeeting("test", "filterTest", "", true);
  await startCurrentUserVideo();
  await displayUserVideo("test", document.getElementById("permissions-video"), true);
  acceptButton.disabled = false;

  acceptButton.addEventListener("click", async function () {
    await detachVideo("test", document.getElementById("permissions-video"));
    document.dispatchEvent(acceptPermissionsEvent);
  });

  document.addEventListener("AcceptedPermissions", async function () {
    content.style.display = "block";
    permissionsForm.style.display = "none";
  });

  return acceptPermissionsEvent;
}

export {
  joinMeeting,
  startCurrentUserVideo,
  displayUserVideo,
  detachVideo,
  leaveMeeting,
  requestPermissions,
};
