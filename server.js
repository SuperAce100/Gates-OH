const express = require("express");
const app = express();
const admin = require("firebase-admin");
const session = require("express-session");

// Initialize Firebase Admin SDK
var serviceAccount;
try {
  serviceAccount = require("./secrets/gates-oh-11854eea02c6.json");
} catch (error) {
  serviceAccount = require("./secrets2/gates-oh-11854eea02c6.json");
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Middleware to serve static files and parse request bodies
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session middleware
app.use(
  session({
    secret: "this_is_a_secret_key_for_session_cookie",
    resave: false,
    saveUninitialized: true,
  })
);

// Firebase Authentication Middleware
function checkAuth(req, res, next) {
  const sessionCookie = req.session.sessionCookie || "";
  admin
    .auth()
    .verifySessionCookie(sessionCookie, true)
    .then((decodedClaims) => {
      next();
    })
    .catch((error) => {
      res.redirect("/login.html");
    });
}

// Routes
app.get("/", checkAuth, (req, res) => {
  console.log("Made it to /");
  res.sendFile(__dirname + "/public/office.html", (err) => {
    if (err) {
      console.log("Error sending file:", err);
      res.status(500).send("Failed to send file.");
    }
  }); // Authenticated users are directed to office.html
});

app.get("/login", (req, res) => {
  res.sendFile(__dirname + "/public/login.html"); // Serve login page
});

app.get("/signup", (req, res) => {
  res.sendFile(__dirname + "/public/signup.html"); // Serve login page
});

app.post("/sessionLogin", (req, res) => {
  const idToken = req.body.idToken.toString();
  const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
  console.log("Made it to backend");

  admin
    .auth()
    .createSessionCookie(idToken, { expiresIn })
    .then(
      (sessionCookie) => {
        req.session.sessionCookie = sessionCookie; // Save the session cookie in the server-side session
        console.log("redirecting to office.html");
        res.redirect("/");
      },
      (error) => {
        res.status(401).send("UNAUTHORIZED REQUEST!");
      }
    );
});

app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/login");
});

app.get("/offices/create", (req, res) => {
  res.sendFile(__dirname + "/public/createOffice.html");
});

app.get("/offices/login", (req, res) => {
  res.sendFile(__dirname + "/public/officeLogin.html");
});

app.get("/offices/:id", (req, res) => {
  res.sendFile(__dirname + "/public/visitor.html");
});

app.get("/offices/:id/monitor", (req, res) => {
  res.sendFile(__dirname + "/public/monitor.html");
});

// Start the server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
