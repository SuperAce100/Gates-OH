import { requestPermissions, displayUserVideo } from "./zoom-sdk.js";

document.addEventListener("DOMContentLoaded", async function () {
  const acceptPermissionsEvent = requestPermissions(
    document.getElementById("permissions-container"),
    document.getElementById("main-content")
  );
});

document.addEventListener("AcceptedPermissions", async function () {
  await displayUserVideo("test", document.getElementById("filter-video"), true);
});

function clearFilters() {
  const collection = document.getElementsByClassName("filter-container");
  for (let i = 0; i < collection.length; i++) {
    collection[i].style.filter = "";
    collection[i].style.transform = "";
  }
}

function animateFilter(animation) {
  const collection = document.getElementsByClassName("filter-container");
  for (let i = 0; i < collection.length; i++) {
    collection[i].classList.add("animate-" + animation);
    collection[i].addEventListener("animationend", function () {
      this.classList.remove("animate-" + animation);
    });
  }
}

document.getElementById("clear-filter-button").addEventListener("click", clearFilters);
document
  .getElementById("blur-filter-button")
  .addEventListener("click", () => animateFilter("blur"));
document
  .getElementById("brightness-filter-button")
  .addEventListener("click", () => animateFilter("brightness"));
document
  .getElementById("contrast-filter-button")
  .addEventListener("click", () => animateFilter("contrast"));
document
  .getElementById("grayscale-filter-button")
  .addEventListener("click", () => animateFilter("grayscale"));
document
  .getElementById("hue-rotate-filter-button")
  .addEventListener("click", () => animateFilter("hue-rotate"));
document
  .getElementById("scale-filter-button")
  .addEventListener("click", () => animateFilter("scale"));
document
  .getElementById("translate-filter-button")
  .addEventListener("click", () => animateFilter("translate"));

document.getElementById("3d-filter-button").addEventListener("click", () => animateFilter("3d"));
