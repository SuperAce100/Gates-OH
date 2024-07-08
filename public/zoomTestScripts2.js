import { leaveMeeting, displayUserVideo, requestPermissions } from "./zoom-sdk.js";

document.addEventListener("DOMContentLoaded", async function () {
  const acceptPermissionsEvent = requestPermissions(
    document.getElementById("permissions"),
    document.getElementById("main-content"),
    "test2",
    "test-meeting"
  );
});

document.addEventListener("AcceptedPermissions", async function () {
  await displayUserVideo("test", document.getElementById("zoom-test-video-container-1"), true);
  await displayUserVideo("test2", document.getElementById("zoom-test-video-container-2"), true);
});

addEventListener("beforeunload", () => {
  const videoContainer = document.getElementById("zoom-test-video-container-1");
  const previewContainer = document.getElementById("zoom-test-video-container-2");

  // Leave the meeting and clear video containers
  leaveMeeting(videoContainer);
  leaveMeeting(previewContainer);
});
