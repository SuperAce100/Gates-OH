const people = [];

people.push(
  {
    id: 1,
    name: "Asanshay Gupta",
    preferredName: "Asanshay",
    room: "Donner 319",
    available: true,
  },
  {
    id: 2,
    name: "Kayvon Fatahalian",
    preferredName: "Kayvon",
    room: "Gates 366",
    available: false,
  },
  {
    id: 3,
    name: "Antonio Kambiré",
    preferredName: "Antonio",
    room: "Donner 321",
    available: false,
  }
);

console.log(people.length);

const peopleContainer = document.getElementById("people");

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
    if (person.available) {
      indicatorDiv.classList.remove("available");
      person.available = false;
    } else {
      indicatorDiv.classList.add("available");
      person.available = true;
    }
  });

  personDiv.id = `person-${person.id}`;

  peopleContainer.appendChild(personDiv);
});
