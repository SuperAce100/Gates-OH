const path = require("path");
const webpack = require("webpack");
const dotenv = require("dotenv");

// Read .env file
dotenv.config();

module.exports = {
  entry: {
    scripts: "./public/scripts.js",
    loginScripts: "./public/loginScripts.js",
  },
  output: {
    filename: "[name]-bundle.js",
    path: path.resolve(__dirname, "./public/dist"),
  },
  plugins: [
    new webpack.DefinePlugin({
      "process.env.ZOOM_SDK_KEY": JSON.stringify(process.env.ZOOM_SDK_KEY),
      "process.env.ZOOM_SDK_SECRET": JSON.stringify(process.env.ZOOM_SDK_SECRET),
    }),
  ],
};
