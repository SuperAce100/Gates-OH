import { getDatabase, ref, set, child, get } from "firebase/database";

function writeUserData(id, name, displayName, room) {
  const db = getDatabase();
  set(ref(db, "users/user-" + id), {
    id: id,
    name: name,
    displayName: displayName,
    room: room,
    available: false,
  });
}

export { writeUserData };
