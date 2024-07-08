const path = require("path");
const webpack = require("webpack");
const dotenv = require("dotenv");

// Read .env file
dotenv.config();

module.exports = {
  entry: {
    scripts: "./public/scripts.js",
    loginScripts: "./public/loginScripts.js",
    monitorScripts: "./public/monitorScripts.js",
    visitorScripts: "./public/visitorScripts.js",
    zoomTestScripts: "./public/zoomTestScripts.js",
    zoomTestScripts2: "./public/zoomTestScripts2.js",
    filterTestScripts: "./public/filterTestScripts.js",
  },
  output: {
    filename: "[name]-bundle.js",
    path: path.resolve(__dirname, "./public/dist"),
  },
  resolve: {
    fallback: {
      zlib: require.resolve("browserify-zlib"),
      querystring: require.resolve("querystring-es3"),
      path: require.resolve("path-browserify"),
      crypto: require.resolve("crypto-browserify"),
      fs: false,
      stream: require.resolve("stream-browserify"),
      http: require.resolve("stream-http"),
      net: false,
      util: require.resolve("util/"),
      url: require.resolve("url/"),
      buffer: require.resolve("buffer/"),
      vm: require.resolve("vm-browserify"),
      assert: require.resolve("assert/"),
      process: false,
      async_hooks: false, // Disable async_hooks as it is not supported in the browser
    },
  },
  plugins: [
    new webpack.DefinePlugin({
      "process.env.ZOOM_SDK_KEY": JSON.stringify(process.env.ZOOM_SDK_KEY),
      "process.env.ZOOM_SDK_SECRET": JSON.stringify(process.env.ZOOM_SDK_SECRET),
    }),
  ],
};
