import app from "./firebase-config.js";
import {
  getDatabase,
  ref,
  onValue,
  update,
  query,
  orderByChild,
  equalTo,
  get,
} from "firebase/database";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { onLog } from "firebase/app";

const people = [];

function renderPeople() {
  const peopleContainer = document.getElementById("rows");
  peopleContainer.innerHTML = "";

  people.forEach((person) => {
    const personDiv = document.createElement("div");
    personDiv.classList.add("person");

    const nameHeading = document.createElement("h3");
    nameHeading.textContent = person.name;

    const roomParagraph = document.createElement("p");
    roomParagraph.textContent = person.room;

    const indicatorDiv = document.createElement("div");
    indicatorDiv.classList.add("indicator");
    if (person.available) {
      indicatorDiv.classList.add("available");
    }

    personDiv.appendChild(nameHeading);
    personDiv.appendChild(roomParagraph);
    personDiv.appendChild(indicatorDiv);

    // personDiv.addEventListener("click", () => {
    //   const db = getDatabase();
    //   const personRef = ref(db, `users/user-${person.id}`);
    //   let newAvailability = !person.available;
    //   update(personRef, { available: newAvailability }).then(() => {
    //     console.log("Availability updated!");
    //   });
    // });

    personDiv.id = `person-${person.id}`;

    peopleContainer.appendChild(personDiv);
  });
}

function updateUserData(data) {
  people.length = 0;
  for (let key in data) {
    people.push(data[key]);
  }
  renderPeople();
}

const db = getDatabase();
const userDataRef = ref(db, "users/");
onValue(
  userDataRef,
  (snapshot) => {
    const data = snapshot.val();
    updateUserData(data);
  },
  (error) => {
    console.error("Failed to read data:", error);
  }
);

console.log("Inside of office");

function updateAvailability(id, available) {
  const personRef = ref(db, `users/user-${id}`);
  update(personRef, { available }).then(() => {
    console.log("Availability updated!");
  });
}

function onLogout() {
  const usersRef = ref(db, "users");
  const userQuery = query(usersRef, orderByChild("user-id"), equalTo(uid));

  get(userQuery)
    .then((snapshot) => {
      if (snapshot.exists()) {
        console.log("User data:", snapshot.val());
        const userData = snapshot.val();
        const key = Object.keys(userData)[0];

        updateAvailability(userData[key].id, false);
      } else {
        console.log("No user found with the UID:", uid);
      }
    })
    .catch((error) => {
      console.log(uid);
      console.error("Error fetching user data:", error);
    });
}

const auth = getAuth(app);
let uid = null;

onAuthStateChanged(auth, (user) => {
  if (user) {
    uid = user.uid;

    const usersRef = ref(db, "users");
    const userQuery = query(usersRef, orderByChild("user-id"), equalTo(uid));

    get(userQuery)
      .then((snapshot) => {
        if (snapshot.exists()) {
          console.log("User data:", snapshot.val());
          const userData = snapshot.val();
          const key = Object.keys(userData)[0];
          document.getElementById("heading").textContent =
            userData[key].preferredName + "'s Office";

          updateAvailability(userData[key].id, true);
        } else {
          console.log("No user found with the UID:", uid);
        }
      })
      .catch((error) => {
        console.log(uid);
        console.error("Error fetching user data:", error);
      });
  } else {
    if (uid) {
      onLogout();
    }
    console.log("User is signed out.");
    window.location.assign("/login.html");
  }
});

window.addEventListener("beforeunload", (event) => {
  if (auth.currentUser) {
    onLogout();
  }
});
