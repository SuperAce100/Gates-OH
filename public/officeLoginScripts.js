import app from "./firebase-config.js";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

const auth = getAuth(app);

document.getElementById("login-form").addEventListener("submit", function (event) {
  event.preventDefault();
  console.log("Form submitted!");

  const email = document.getElementById("urlid").value + "@gatesoh-users.com";
  const urlid = document.getElementById("urlid").value;
  const password = document.getElementById("password").value;
  const errorMessageElement = document.getElementById("error-message");

  signInWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      // Signed in
      const user = userCredential.user;
      // Get the user's ID token as it is needed to authenticate with the backend
      user.getIdToken().then((idToken) => {
        // Send token to your backend via HTTP
        fetch("/sessionLogin", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ idToken }),
        })
          .then(() => {
            window.location.assign(`/offices/${urlid}/monitor`); // Redirect to the office page after login
          })
          .catch((error) => {
            console.error("Error sending token to backend:", error);
          });
      });
    })
    .catch((error) => {
      const errorCode = error.code;
      const errorMessage = error.message;
      errorMessageElement.innerHTML = `${errorMessage}`; // Display error message
      console.error("Error signing in:", errorMessage);
    });
});

console.log("Login scripts loaded.");
