import { on } from "process";
import app from "./firebase-config.js";
import { getDatabase, ref, onValue, update } from "firebase/database";

const db = getDatabase(app);
const officesRef = ref(db, "offices");

onValue(officesRef, (snapshot) => {
  const data = snapshot.val();
  const offices = Object.values(data);
  console.log("offices", offices);
  displayOffices(offices);
});

let interactionRef = ref(db, "globalValues");

onValue(interactionRef, (snapshot) => {
  let data = snapshot.val();
  let chosenType = data.interactionType;
  console.log("chosenType", chosenType);
  generateDropdownContent(chosenType);
});

// Function to generate the dropdown content
function generateDropdownContent(chosenType) {
  const interactions = ["Scale", "Blur", "Slide"];
  const dropdownContent = document.getElementById("dropdownContent");

  // Clear existing content
  dropdownContent.innerHTML = "";

  interactions.forEach((interaction) => {
    const a = document.createElement("a");
    a.href = "#";
    a.textContent = interaction;
    a.id = interaction.toLowerCase();

    // Add selected class if it matches the interactionType
    if (interaction.toLowerCase() === chosenType) {
      console.log("selecting type", chosenType);
      a.classList.add("selected");
    }

    // Add click event listener to update interactionType
    a.addEventListener("click", (e) => {
      e.preventDefault();
      let interactionType = interaction.toLowerCase();
      update(interactionRef, { interactionType });
    });

    dropdownContent.appendChild(a);
  });
}
generateDropdownContent();

function displayOffices(offices) {
  const officesContainer = document.getElementById("rows");
  officesContainer.innerHTML = "";

  offices.forEach((office) => {
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
    }

    const spacer = document.createElement("div");
    spacer.classList.add("spacer");

    officeDiv.append(nameHeading, descriptionParagraph, spacer, indicatorDiv);
    officeDiv.id = office.urlid;

    // officeDiv redirects to the office page on click
    officeDiv.addEventListener("click", () => {
      window.location.href = `offices/${office.urlid}/visit`;
    });

    officesContainer.appendChild(officeDiv);
  });
}
