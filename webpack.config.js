const path = require("path");

module.exports = {
  entry: {
    scripts: "./public/scripts.js",
    loginScripts: "./public/loginScripts.js",
  },
  output: {
    filename: "[name]-bundle.js",
    path: path.resolve(__dirname, "./public/dist"),
  },
};
