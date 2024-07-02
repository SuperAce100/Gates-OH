import { joinMeeting, connectToVideo, leaveMeeting } from "./zoom-sdk.js";

addEventListener("DOMContentLoaded", async () => {
  console.log("Joining Meeting");

  // Join the meeting first
  await joinMeeting("kayvonf", "Gates-OH", "", true);

  const videoContainer = document.getElementById("zoom-test-video-container-1");
  const previewContainer = document.getElementById("zoom-test-video-container-2");

  // Connect to video streams after joining the meeting
  connectToVideo("asanshay", videoContainer);
  connectToVideo("kayvonf", previewContainer);
});

addEventListener("beforeunload", () => {
  const videoContainer = document.getElementById("zoom-test-video-container-1");
  const previewContainer = document.getElementById("zoom-test-video-container-2");

  // Leave the meeting and clear video containers
  leaveMeeting(videoContainer);
  leaveMeeting(previewContainer);
});
