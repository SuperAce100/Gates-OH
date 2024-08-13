import app from "./firebase-config.js";
import { getDatabase, ref, onValue, update, get } from "firebase/database";

function interpolate(data, x) {
  // Find the two keys that x is between
  const keys = Object.keys(data);
  let lowerKey = "0%";
  let upperKey = "100%";

  const keysInt = keys.map((key) => parseInt(key));
  keysInt.sort((a, b) => a - b);

  for (let i = 0; i < keysInt.length; i++) {
    if (keysInt[i] <= x) {
      lowerKey = keysInt[i] + "%";
    }
    if (keysInt[i] >= x) {
      upperKey = keysInt[i] + "%";
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

  // Ensure the value is not negative
  value = Math.max(value, 0);

  return value;
}

// x between 0 and 100 -> blur value from 20 to 0
function blurCurve(x, curves = null) {
  return 50 * interpolate(curves.blur, x);

  // return 20 - x / 5;
}

// x between 0 and 100 -> volume value from 0.1 to 0
function ambienceCurve(x, curves = null) {
  return interpolate(curves.ambience, x);
}

// x between 0 and 100 -> opacity value from 100 to 0
function tutorialCurve(x, curves = null) {
  return interpolate(curves.tutorial, x);
}

function translationXCurve(x, curves = null) {
  return interpolate(curves.translationX, x) * 200 - 100;
}

function translationYCurve(x, curves = null) {
  return interpolate(curves.translationY, x) * 200 - 100;
}

function scaleCurve(x, curves = null) {
  console.log("Scale Progress", x, interpolate(curves.scale, x));
  return interpolate(curves.scale, x);
}

function officeCurve(x, curves = null) {
  return interpolate(curves.office, x);
}

export {
  blurCurve,
  ambienceCurve,
  tutorialCurve,
  translationXCurve,
  translationYCurve,
  scaleCurve,
  officeCurve,
};
