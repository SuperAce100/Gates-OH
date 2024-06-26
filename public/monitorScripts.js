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

let tokens = window.location.pathname.split("/");
let id = tokens[tokens.length - 2];

console.log("id", id);

const db = getDatabase(app);

// Get the entry from the offices table where urlid = id
const officeRef = ref(db, `offices/${id}`);

let visitorId = null;
let unsubscriber = null;

onValue(
  officeRef,
  (snapshot) => {
    const data = snapshot.val();
    const office = data;
    console.log("office", office);
    document.getElementById("heading").textContent = office.name;
    console.log("Current Visitor: ", office.currentVisitorId);
    visitorId = office.currentVisitorId;

    // Check if there is no current visitor
    if (!office.currentVisitorId) {
      unsubscriber();
      console.log("No one is currently visiting.");
      document.getElementById("label").textContent = "No one is currently visiting.";
      visitorId = null; // Clear the visitorId
      return;
    } else {
      visitorId = office.currentVisitorId;
      unsubscriber = updateCurrentUser(visitorId, unsubscriber);
    }
  },
  (error) => {
    console.error("Error reading data:", error);
  }
);

function updateCurrentUser(user_id) {
  const userRef = ref(db, `users/${user_id}`);
  console.log("user id", user_id);
  if (!user_id) {
    document.getElementById("label").textContent = "Nobody is currently visiting.";
    return;
  }
  return onValue(
    userRef,
    (snapshot) => {
      const data = snapshot.val();
      const user = data;
      console.log("changing user data with new user", user);

      document.getElementById("label").textContent = user.preferredName + " is currently visiting.";
    },
    (error) => {
      console.error("Error reading data:", error);
    }
  );
}
