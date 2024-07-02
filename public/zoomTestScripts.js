import { joinMeeting, startCurrentUserVideo, leaveMeeting, displayUserVideo } from "./zoom-sdk.js";

addEventListener("DOMContentLoaded", async () => {
  console.log("Joining Meeting");

  // Join the meeting first
  await joinMeeting("asanshay", "Gates-OH", "", true);

  const videoContainer = document.getElementById("zoom-test-video-container-1");
  const previewContainer = document.getElementById("zoom-test-video-container-2");

  await startCurrentUserVideo();

  // Connect to video streams after joining the meeting
  displayUserVideo("kayvonf", videoContainer);
  displayUserVideo("asanshay", previewContainer, true);
});

addEventListener("beforeunload", () => {
  const videoContainer = document.getElementById("zoom-test-video-container-1");
  const previewContainer = document.getElementById("zoom-test-video-container-2");

  // Leave the meeting and clear video containers
  leaveMeeting(videoContainer);
  leaveMeeting(previewContainer);
});
