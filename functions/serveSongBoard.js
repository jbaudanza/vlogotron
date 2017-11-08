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

  let openGraph;

  if (req.path === "/") {
    openGraph = {
      "og:title": "Vlogotron: Remix My Face!",
      "og:url": "https://www.vlogotron.com/",
      "og:image": "https://www.vlogotron.com/screenshot.png"
    };
  } else if (req.path === "/songs/-KvXvCxVaAskZ62l5AJr") {
    openGraph = {
      "og:title": "Vlogotron: Slide 100bpm",
      "og:url": "https://www.vlogotron.com" + String(req.path),
      "og:image": "https://s3-us-west-1.amazonaws.com/www.jonb.org/abay.png",
      "og:type": "video.other",
      "fb:app_id": "177263209421488",
      "og:description": "Abay beatboxes at 100bpm",
      "og:video:url": "https://s3-us-west-1.amazonaws.com/www.jonb.org/demo-offwhite.mp4",
      "og:video:secure_url": "https://s3-us-west-1.amazonaws.com/www.jonb.org/demo-offwhite.mp4",
      "og:video:width": 800,
      "og:video:height": 800,
      "og:video:type": "video/mp4"
    };
  } else {
    openGraph = {
      "og:title": "Vlogotron",
      "og:url": "https://www.vlogotron.com" + String(req.path),
      "og:image": null
    };
  }

  res.writeHead(200, { "Content-Type": "text/html" });
  res.end(renderTemplate({openGraph}));
}

module.exports = createVideoClip;
