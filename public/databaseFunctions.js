import { getDatabase, ref, set, child, get } from "firebase/database";

function writeUserData(id, name, preferredName, room) {
  const db = getDatabase();
  set(ref(db, "users/user-" + id), {
    id: id,
    name: name,
    preferredName: preferredName,
    room: room,
    available: false,
  });
}

export { writeUserData };
