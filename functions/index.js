/* @flow */

const functions = require("firebase-functions");

const doTranscodeJob = require("./transcoder");

const admin = require("firebase-admin");
admin.initializeApp(functions.config().firebase);

const cors = require("./cors");
const auth = require("./auth");

exports.transcodeVideo = functions.storage
  .bucket("vlogotron-uploads")
  .object()
  .onChange(event => {
    if (event.data.resourceState === "exists") {
      if (event.data.name.startsWith("video-clips/")) {
        return doTranscodeJob(
          event.data.bucket,
          event.data.name,
          admin.database
        );
      } else {
        console.warn("Received unexpected storage event on ", event.data.name);
      }
    }
  });

exports.accessLog = functions.https.onRequest((req, res) => {
  console.log("IP: ", req.ip);

  if (req.query.referrer) {
    console.log("Referrer: " + req.query.referrer);
  }

  if (req.get("User-Agent")) {
    console.log("User-Agent: " + req.get("User-Agent"));
  }

  res.setHeader("content-type", "text/javascript");
  res.status(200).send("true;");
});

/*::
  type ApiHandler = (Object, ExpressRequest, http$ServerResponse) => void;
  type GCFHandler = (ExpressRequest, http$ServerResponse) => void;
*/

function makeApi(handler /*: ApiHandler */) /*: GCFHandler */ {
  return function(req, res) {
    cors(req, res, () => {
      auth(admin, req, res, () => {
        handler(admin, req, res);
      });
    });
  };
}

exports.charge = functions.https.onRequest(makeApi(require("./charge")));
exports.videoClips = functions.https.onRequest(
  makeApi(require("./createVideoClip"))
);
exports.serveSongBoard = functions.https.onRequest(require("./serveSongBoard"));
