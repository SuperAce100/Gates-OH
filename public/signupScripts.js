import app from "./firebase-config.js";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { getDatabase, ref, set, query, onValue, orderByChild, equalTo } from "firebase/database";

const auth = getAuth(app);
const database = getDatabase(app);

document.getElementById("signup-form").addEventListener("submit", function (event) {
  event.preventDefault();
  console.log("Form submitted!");

  const fullName = document.getElementById("full-name").value;
  const preferredName = document.getElementById("preferred-name").value;
  const officeName = document.getElementById("office-name").value;
  const officeDescription = document.getElementById("office-description").value;
  const username = document.getElementById("username").value.toLowerCase();
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const errorMessageElement = document.getElementById("error-message");

  if (
    !fullName ||
    !preferredName ||
    !officeName ||
    !officeDescription ||
    !username ||
    !email ||
    !password
  ) {
    errorMessageElement.innerHTML = "Please fill out all fields.";
    return;
  }

  // check if the username is already taken
  const userRef = ref(database, "users");
  const userQuery = query(userRef, orderByChild("id"), equalTo(username));
  onValue(userQuery, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      errorMessageElement.innerHTML = "Username is already taken.";
      return;
    }
  });

  createUserWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      // Signed up
      const user = userCredential.user;
      const userId = user.uid;

      set(ref(database, "users/" + username), {
        name: fullName,
        preferredName: preferredName,
        id: username,
        "user-id": userId,
      })
        .then(() => {
          console.log("User added to database with username:", username);
        })
        .catch((error) => {
          console.error("Error adding user to database:", error);
        });

      set(ref(database, "offices/" + username), {
        name: officeName,
        description: officeDescription,
        urlid: username,
        doorOpen: false,
      })
        .then(() => {
          console.log("Office added to database with username:", username);
        })
        .catch((error) => {
          console.error("Error adding office to database:", error);
        });

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
            window.location.assign("/office.html"); // Redirect to the office page after signup
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
      console.error("Error signing up:", errorMessage);
    });
});

console.log("Signup scripts loaded.");
