import app from "./firebase-config.js";
import { getDatabase, ref, onValue, update, get } from "firebase/database";

// data is an object with keys like "0%", "10%", "20%", ..., "100%"
// x is a number between 0 and 100
function interpolate(data, x) {
  // Find the two keys that x is between
  const keys = Object.keys(data);
  let lowerKey = "0%";
  let upperKey = "100%";
  for (let i = 0; i < keys.length; i++) {
    if (parseInt(keys[i]) <= x) {
      lowerKey = keys[i];
    }
    if (parseInt(keys[i]) >= x) {
      upperKey = keys[i];
      break;
    }
  }

  // Interpolate the value between the two keys
  const lowerValue = data[lowerKey];
  const upperValue = data[upperKey];
  const lowerX = parseInt(lowerKey);
  const upperX = parseInt(upperKey);
  let value;
  if (lowerX === upperX) {
    value = lowerValue;
  } else {
    value = lowerValue + ((upperValue - lowerValue) * (x - lowerX)) / (upperX - lowerX);
  }

  return value;
}

// x between 0 and 100 -> blur value from 20 to 0
async function blurCurve(x) {
  const db = getDatabase(app);
  let blurRef = ref(db, `globalValues/curves/blur`);
  let data = {};
  return await get(blurRef).then((snapshot) => {
    data = snapshot.val();
    let blur = 20 * interpolate(data, x);
    console.log("Blur", blur);
    if (isNaN(blur)) console.log("Data", data, x, interpolate(data, x));
    return 20 * interpolate(data, x);
  });

  // return 20 - x / 5;
}

// x between 0 and 100 -> volume value from 0.1 to 0
async function ambienceCurve(x) {
  const db = getDatabase(app);
  let ambienceRef = ref(db, `globalValues/curves/ambience`);
  let data = {};
  return await get(ambienceRef).then((snapshot) => {
    data = snapshot.val();
    return interpolate(data, x);
  });

  // return Math.max(0, 0.1 - x / 300);
}

// x between 0 and 100 -> opacity value from 100 to 0
function tutorialCurve(x) {
  return Math.max(0, 100 - 5 * x);
}

function translationCurve(x) {
  return 0;
}

function scaleCurve(x) {
  return 1;
}

function officeCurve(x) {
  return x;
}

export { blurCurve, ambienceCurve, tutorialCurve, translationCurve, scaleCurve, officeCurve };
