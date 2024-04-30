// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getDatabase, ref, onValue, update } from "firebase/database";
import firebaseConfig from "../firebase-config.json";
// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional

// firebaseConfig = json.parse(config);
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

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

    personDiv.addEventListener("click", () => {
      const db = getDatabase();
      const personRef = ref(db, `users/user-${person.id}`);
      let newAvailability = !person.available;
      update(personRef, { available: newAvailability }).then(() => {
        console.log("Availability updated!");
      });
    });

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
    console.log("Data updated!");
    const data = snapshot.val();
    updateUserData(data);
  },
  (error) => {
    console.error("Failed to read data:", error);
  }
);
