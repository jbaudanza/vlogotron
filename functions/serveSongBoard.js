/* @flow */
const path = require("path");
const ejs = require("ejs");
const fs = require("fs");

const renderTemplate = ejs.compile(
  fs.readFileSync(path.join(__dirname, "songboard.html"), "utf8")
);

function createVideoClip(
  req /*: ExpressRequest */,
  res /*: ExpressResponse */
) {
  if (req.method !== "GET") {
    res.sendStatus(405);
    return;
  }

  let options;

  if (req.path === "/") {
    options = {
      title: "Vlogotron: Remix My Face!",
      url: "https://www.vlogotron.com/",
      image: "https://www.vlogotron.com/screenshot.png"
    };
  } else {
    options = {
      title: "Vlogotron",
      url: "https://www.vlogotron.com" + String(req.path),
      image: null
    };
  }

  res.writeHead(200, { "Content-Type": "text/html" });
  res.end(renderTemplate(options));
}

module.exports = createVideoClip;
