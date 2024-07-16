import KJUR from "jsrsasign";
import ZoomVideo, { VideoQuality } from "@zoom/videosdk";
import { getAuth } from "firebase/auth";
import { getDatabase, ref, query, orderByChild, equalTo, get, update } from "firebase/database";
import app from "./firebase-config.js";

const RESOLUTION = { width: 1920, height: 1080 };
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

async function startCurrentUserAudio() {
  const stream = client.getMediaStream();

  try {
    const userId = client.getCurrentUserInfo().userId;
    await stream.startAudio(userId);

    const users = await client.getAllUser();
    for (const user of users) {
      console.log("Muting user audio", user.userId);
      await stream.adjustUserAudioVolumeLocally(user.userId, 0);
    }

    client.on("user-added", async (e) => {
      await stream.adjustUserAudioVolumeLocally(e[0].userId, 0);
      console.log("Muting user audio", e[0].userId);
    });

    console.log("Current user audio started");
  } catch (error) {
    console.error("Error starting current user's audio:", error);
  }
}

// volume is a number between 0 and 100
async function playUserAudio(username, volume) {
  const users = client.getAllUser();
  const user = users.find((user) => user.userIdentity === username);

  if (user) {
    const stream = client.getMediaStream();
    try {
      stream.adjustUserAudioVolumeLocally(user.userId, volume);
      console.log(`Playing ${username}'s audio at volume: ${volume}`);
    } catch (error) {
      console.error("Error playing user's audio:", error);
    }
  } else {
    console.error(`${username} is not connected`);
  }
}

async function displayUserVideo(username, container, isPreview = false) {
  async function attachVideo(user) {
    const stream = client.getMediaStream();
    try {
      const userVideo = await stream.attachVideo(user.userId, VideoQuality.Video_1080P);
      if (isPreview) {
        userVideo.style.transform = "scaleX(-1)";
      }
      container.appendChild(userVideo);
    } catch (error) {
      console.error("Error connecting to video:", error);
    }
  }

  const users = client.getAllUser();
  const user = users.find((user) => user.userIdentity === username);

  if (user) {
    container.innerHTML = "";
    console.log("User found:", user.userIdentity);
    await attachVideo(user);
  } else {
    console.log(users);
    container.innerHTML = `${username} has not connected`;
  }

  if (!isPreview) {
    client.on("user-added", async (event) => {
      const newUser = event.user;
      if (newUser.userIdentity === username) {
        console.log(`User joined: ${newUser.userIdentity}`);
        await attachVideo(newUser);
      }
    });

    client.on("video-active-change", async (event) => {
      const user = client.getAllUser().find((user) => user.userId === event.userId);
      if (user && user.userIdentity === username) {
        console.log(`User started video: ${user.userIdentity}`);
        await attachVideo(user);
      }
    });
  }
}

async function detachVideo(username, container) {
  const users = client.getAllUser();
  const user = users.find((user) => user.userIdentity === username);

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

function generateCameraDropdown(container) {
  const stream = client.getMediaStream();
  const cameras = stream.getCameraList();

  const dropdown = document.createElement("select");
  dropdown.id = "camera-dropdown";
  dropdown.className = "glass";
  dropdown.style.appearance = "none";
  dropdown.style.outline = "none";

  dropdown.addEventListener("change", async function () {
    const selectedCamera = cameras[this.selectedIndex];
    await stream.switchCamera(selectedCamera.deviceId);
  });

  cameras.forEach((camera) => {
    const option = document.createElement("option");
    option.value = camera.deviceId;
    option.text = camera.label;
    dropdown.appendChild(option);
  });

  container.appendChild(dropdown);
}

function generateMicDropdown(container) {
  const stream = client.getMediaStream();
  const mics = stream.getMicList();

  const dropdown = document.createElement("select");
  dropdown.id = "mic-dropdown";
  dropdown.className = "glass";
  dropdown.style.appearance = "none";
  dropdown.style.outline = "none";

  dropdown.addEventListener("change", async function () {
    const selectedMic = mics[this.selectedIndex];
    await stream.switchMicrophone(selectedMic.deviceId);
  });

  mics.forEach((mic) => {
    const option = document.createElement("option");
    option.value = mic.deviceId;
    option.text = mic.label;
    dropdown.appendChild(option);
  });

  container.appendChild(dropdown);
}

function generateSpeakerDropdown(container) {
  const stream = client.getMediaStream();
  const speakers = stream.getSpeakerList();

  const dropdown = document.createElement("select");
  dropdown.id = "speaker-dropdown";
  dropdown.className = "glass";
  dropdown.style.appearance = "none";
  dropdown.style.outline = "none";

  console.log(speakers);

  dropdown.addEventListener("change", async function () {
    const selectedSpeaker = speakers[this.selectedIndex];
    await stream.switchSpeaker(selectedSpeaker.deviceId);
  });

  speakers.forEach((speaker) => {
    const option = document.createElement("option");
    option.value = speaker.deviceId;
    option.text = speaker.label;
    dropdown.appendChild(option);
  });

  container.appendChild(dropdown);
}

async function requestPermissions(
  container,
  content,
  username,
  meetingName,
  message = "Accept permissions to drop in!"
) {
  const permissionsForm = document.createElement("div");

  permissionsForm.className = "container glass permissions-form";
  permissionsForm.id = "permissions-form";

  const label = document.createElement("p");
  label.id = "label";
  label.className = "monitor-label";
  label.innerText = message;

  const videoContainer = document.createElement("div");
  videoContainer.className = "video";
  videoContainer.id = "permissions-video-container";

  const videoPlayerContainer = document.createElement("video-player-container");
  videoPlayerContainer.id = "permissions-video";

  videoContainer.appendChild(videoPlayerContainer);

  const cameraDropdownContainer = document.createElement("div");
  cameraDropdownContainer.id = "camera-dropdown-container";

  const micDropdownContainer = document.createElement("div");
  micDropdownContainer.id = "mic-dropdown-container";

  const speakerDropdownContainer = document.createElement("div");
  speakerDropdownContainer.id = "speaker-dropdown-container";

  const acceptButton = document.createElement("button");
  acceptButton.id = "accept-permissions-button";
  acceptButton.className = "glass-button denied";
  acceptButton.innerText = message;
  acceptButton.disabled = true;

  const dropdownDiv = document.createElement("div");
  dropdownDiv.className = "permissions-dropdown-container";
  dropdownDiv.appendChild(cameraDropdownContainer);
  dropdownDiv.appendChild(micDropdownContainer);
  dropdownDiv.appendChild(speakerDropdownContainer);

  const rowDiv = document.createElement("div");
  rowDiv.className = "permissions-row";

  rowDiv.appendChild(videoContainer);
  rowDiv.appendChild(dropdownDiv);
  permissionsForm.appendChild(rowDiv);

  permissionsForm.appendChild(acceptButton);

  container.appendChild(permissionsForm);

  const acceptPermissionsEvent = new Event("AcceptedPermissions");

  content.style.display = "none";
  await joinMeeting(username, meetingName, "", true);
  await startCurrentUserVideo();
  await startCurrentUserAudio();
  await displayUserVideo(username, document.getElementById("permissions-video"), true);
  generateCameraDropdown(cameraDropdownContainer);
  generateMicDropdown(micDropdownContainer);
  generateSpeakerDropdown(speakerDropdownContainer);

  acceptButton.disabled = false;
  acceptButton.id = "acceptButton";

  acceptButton.addEventListener("click", async function () {
    await detachVideo(username, document.getElementById("permissions-video"));
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
  startCurrentUserAudio,
  playUserAudio,
  displayUserVideo,
  detachVideo,
  leaveMeeting,
  requestPermissions,
};
