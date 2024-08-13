import app from "./firebase-config.js";
import { getDatabase, ref, onValue, update } from "firebase/database";

document.addEventListener("DOMContentLoaded", () => {
  let currentSegment = ""; // Global variable to store the current segment
  let unsubscriber = null;
  const db = getDatabase(app);

  const segments = [
    "blur",
    "ambience",
    "tutorial",
    "translationX",
    "translationY",
    "scale",
    "office",
  ];
  segments.forEach((segment, index) => {
    document.getElementById(segment).addEventListener("click", () => {
      // Update the global variable with the selected segment
      currentSegment = segment;
      console.log("Current Segment:", currentSegment);
      if (unsubscriber) unsubscriber();

      // Get the reference to the selected segment
      let segmentRef = ref(db, `globalValues/curves/${segment}`);
      unsubscriber = onValue(segmentRef, (snapshot) => {
        let data = snapshot.val();
        // Make sure data exists for all points, otherwise set default values
        const defaultData = {
          "0%": 0.5,
          "10%": 0.5,
          "20%": 0.5,
          "30%": 0.5,
          "40%": 0.5,
          "50%": 0.5,
          "60%": 0.5,
          "70%": 0.5,
          "80%": 0.5,
          "90%": 0.5,
          "100%": 0.5,
        };
        data = { ...defaultData, ...data };
        // Update the curve with the data from the database
        drawEqualizer(data);
      });

      segments.forEach((s) => {
        const element = document.getElementById(s);
        if (s === segment) {
          element.classList.add("active"); // Add 'active' class to the selected segment
        } else {
          element.classList.remove("active"); // Remove 'active' class from others
        }
      });
    });
  });

  const canvas = document.getElementById("equalizer");
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  let isDragging = false;
  let dragIndex = -1;

  const padding = 50;
  const drawWidth = canvas.width - padding * 2;
  const drawHeight = canvas.height - padding * 2;

  function drawGrid() {
    ctx.strokeStyle = "rgba(100, 100, 100, 0.3)";
    ctx.lineWidth = 1;

    // Vertical lines
    for (let i = 0; i <= 10; i++) {
      const x = padding + (i / 10) * drawWidth;
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, canvas.height - padding);
      ctx.stroke();
    }

    // Horizontal lines
    for (let i = 0; i <= 5; i++) {
      const y = padding + (i / 5) * drawHeight;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(canvas.width - padding, y);
      ctx.stroke();
    }
  }

  function drawEqualizer(equalizerData) {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    drawGrid();

    // Update levels and frequencies from the object
    let levels = Object.values(equalizerData);
    let frequencies = Object.keys(equalizerData);

    // Draw lines between points
    ctx.beginPath();
    ctx.moveTo(padding, padding + drawHeight * (1 - levels[0]));
    for (let i = 1; i < levels.length; i++) {
      const x = padding + (i / (levels.length - 1)) * drawWidth;
      const y = padding + drawHeight * (1 - levels[i]);
      ctx.lineTo(x, y);
    }
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw points
    ctx.fillStyle = "#0093af";
    for (let i = 0; i < levels.length; i++) {
      const x = padding + (i / (levels.length - 1)) * drawWidth;
      const y = padding + drawHeight * (1 - levels[i]);
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw frequency labels
    ctx.fillStyle = "white";
    ctx.font = "12px Arial";
    ctx.textAlign = "center";
    for (let i = 0; i < frequencies.length; i++) {
      const x = padding + (i / (frequencies.length - 1)) * drawWidth;
      ctx.fillText(frequencies[i], x, canvas.height - padding + 15);
    }

    // Draw percentage labels
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (let i = 0; i <= 5; i++) {
      const y = padding + (1 - i / 5) * drawHeight;
      ctx.fillText(`${i * 20}%`, padding - 5, y);
    }

    function getMousePos(canvas, evt) {
      const rect = canvas.getBoundingClientRect();
      return {
        x: evt.clientX - rect.left,
        y: evt.clientY - rect.top,
      };
    }

    function onLevelChange(index, newLevel) {
      // console.log(
      //   `State ${frequencies[index]} of curve ${currentSegment} changed to ${(newLevel * 100).toFixed(
      //     0
      //   )}%`
      // );
      const segmentRef = ref(db, `globalValues/curves/${currentSegment}`);
      update(segmentRef, {
        [frequencies[index]]: newLevel,
      });
    }

    canvas.addEventListener("mousedown", (e) => {
      const mousePos = getMousePos(canvas, e);

      for (let i = 0; i < levels.length; i++) {
        const x = padding + (i / (levels.length - 1)) * drawWidth;
        const y = padding + drawHeight * (1 - levels[i]);
        if (Math.abs(mousePos.x - x) < 10 && Math.abs(mousePos.y - y) < 10) {
          isDragging = true;
          dragIndex = i;
          break;
        }
      }
    });

    canvas.addEventListener("mousemove", (e) => {
      if (isDragging && dragIndex !== -1) {
        const mousePos = getMousePos(canvas, e);
        let newLevel = 1 - (mousePos.y - padding) / drawHeight;
        newLevel = Math.max(0, Math.min(1, newLevel));

        if (levels[dragIndex] !== newLevel) {
          levels[dragIndex] = newLevel;
          onLevelChange(dragIndex, newLevel);
        }
      }
    });

    canvas.addEventListener("mouseup", () => {
      isDragging = false;
      dragIndex = -1;
    });

    canvas.addEventListener("mouseleave", () => {
      isDragging = false;
      dragIndex = -1;
    });
  } // Draw equalizer
});
