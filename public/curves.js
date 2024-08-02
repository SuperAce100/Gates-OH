// x between 0 and 100 -> blur value from 20 to 0
function blurCurve(x) {
  return 20 - x / 5;
}

// x between 0 and 100 -> volume value from 0.1 to 0
function ambienceCurve(x) {
  return Math.max(0, 0.1 - x / 300);
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
