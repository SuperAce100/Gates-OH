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

function joinMeeting(username, sessionName, sessionPasscode, isHost) {
  const jwtToken = generateJWT(
    sdkKey,
    sdkSecret,
    sessionName,
    isHost ? 1 : 0,
    sessionPasscode,
    username
  );

  client
    .init("en-US", "Global", { patchJsMedia: true })
    .then(() => {
      console.log("Joining ", sessionName, " with JWT token:", jwtToken, " as ", username);
      return client.join(sessionName, jwtToken, username, sessionPasscode);
    })
    .catch((error) => {
      console.error("Error joining meeting:", error);
    });
}

function connectToVideo(username, container) {
  client.getAllUser().forEach((user) => {
    if (user.displayName === username) {
      client
        .getMediaStream()
        .startVideo()
        .then(() => {
          return client.getMediaStream().attachVideo(user.userId, RESOLUTION);
        })
        .then((userVideo) => {
          container.appendChild(userVideo);
        })
        .catch((error) => {
          console.error("Error connecting to video:", error);
        });
    }
  });
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

export { joinMeeting, connectToVideo, leaveMeeting };
