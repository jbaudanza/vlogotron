const functions = require("firebase-functions");

const doTranscodeJob = require("./transcoder");

const admin = require("firebase-admin");
admin.initializeApp(functions.config().firebase);

exports.transcodeVideo = functions.storage
  .bucket("vlogotron-uploads")
  .object()
  .onChange(event => {
    if (event.data.resourceState === "exists") {
      if (event.data.name.startsWith("video-clips/")) {
        return doTranscodeJob(
          event.data.bucket,
          event.data.name,
          admin.database()
        );
      } else {
        console.warn("Received unexpected storage event on ", event.data.name);
      }
    }
  });
