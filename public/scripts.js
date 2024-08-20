import app from "./firebase-config.js";
import { getDatabase, ref, onValue, update, query, orderByChild, equalTo } from "firebase/database";
import { getAuth } from "firebase/auth";

const db = getDatabase(app);
const officesRef = ref(db, "offices");

let currentUserID = "";

const auth = getAuth(app);

// Function to get the current user, returns a promise
function getCurrentUser() {
  return new Promise((resolve, reject) => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      unsubscribe(); // Unsubscribe immediately after getting the user
      resolve(user);
    }, reject);
  });
}

getCurrentUser()
  .then((user) => {
    if (user) {
      const uid = user.uid;
      console.log("UID", uid);

      const userRef = query(ref(db, "users"), orderByChild("id"), equalTo(uid));
      onValue(userRef, (snapshot) => {
        const userData = snapshot.val();
        if (userData) {
          const userKey = Object.keys(userData)[0];
          currentUserID = userData[userKey].id;
          console.log("user", userData[userKey]);

          onValue(officesRef, (snapshot) => {
            const data = snapshot.val();
            const offices = Object.values(data);
            console.log("offices", offices);
            displayOffices(offices);
          });
        }
      });
    } else {
      console.log("No user is signed in.");
    }
  })
  .catch((error) => {
    console.error("Error fetching the current user: ", error);
  });

function displayOffices(offices) {
  const officesContainer = document.getElementById("rows");
  officesContainer.innerHTML = "";

  offices.forEach((office) => {
    if (office.urlid === currentUserID) {
      console.log(office.urlid, currentUserID);
      return;
    }
    const officeDiv = document.createElement("div");
    officeDiv.classList.add("person");

    const nameHeading = document.createElement("h3");
    nameHeading.textContent = office.name;

    const descriptionParagraph = document.createElement("p");
    descriptionParagraph.textContent = office.description;

    const indicatorDiv = document.createElement("div");
    indicatorDiv.classList.add("indicator");
    if (office.doorOpen) {
      indicatorDiv.classList.add("available");

      // officeDiv redirects to the office page on click
      officeDiv.addEventListener("click", () => {
        window.location.href = `/offices/${office.urlid}`;
      });
    } else {
      officeDiv.classList.add("door-closed");
    }

    const spacer = document.createElement("div");
    spacer.classList.add("spacer");
    officeDiv.append(nameHeading, descriptionParagraph, spacer);
    if (office.adminUser === currentUserID) {
      const resetButton = document.createElement("button");
      resetButton.textContent = "Reset";
      resetButton.classList.add("glass-button");
      resetButton.id = "reset-button";
      const officeRef = ref(db, `offices/${office.urlid}`);
      resetButton.addEventListener("click", (event) => {
        event.stopPropagation();

        const time = new Date().getTime();
        update(officeRef, { resetCount: time });
      });
      officeDiv.append(resetButton);
    }
    officeDiv.append(indicatorDiv);

    officeDiv.id = office.urlid;

    officesContainer.appendChild(officeDiv);
  });
}
