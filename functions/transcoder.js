const os = require("os");
const fs = require("fs");
const path = require("path");
const process = require("process");

// We are currently using a forked version of the storage module that disables
// the forever user-agent.  We should follow this issue and go back to the
// mainline when appropriate:
// https://issuetracker.google.com/issues/36667671
const gcs = require("@google-cloud/storage")();

const ffmpeg = require("fluent-ffmpeg");
ffmpeg.setFfmpegPath(require("@ffmpeg-installer/ffmpeg").path);
ffmpeg.setFfprobePath(require("@ffprobe-installer/ffprobe").path);

let jobCount = 0;
const tempDir = os.tmpdir();

function runTranscodeJob(bucketName, inputStorageName, database) {
  console.log("Running transcoder on", inputStorageName);

  const list = inputStorageName.split("/");
  const clipId = list[1];

  const filenamePrefix = `transcoder-${process.pid}-${jobCount}`;

  const inputFilename = path.join(tempDir, filenamePrefix + "-input");
  const outputFilename = path.join(tempDir, filenamePrefix);

  jobCount++;

  const sourceBucket = gcs.bucket(bucketName);
  const destinationBucket = gcs.bucket("vlogotron-95daf.appspot.com");

  const outputStorageName = "video-clips/" + clipId;

  function doDownload() {
    return sourceBucket
      .file(inputStorageName)
      .download({ destination: inputFilename });
  }

  return (
    doWithRetries(doDownload, 5)
      .then(() => console.log("Download finished"))
      .then(() => transcode(inputFilename, tempDir, filenamePrefix))
      // This is kind of a hack. It seems like the ffmpeg process takes a little
      // while to shutdown and close out the file description. So we have to
      // poll to make sure it's ready before uploading.
      .then(() => waitForFileToExist(outputFilename + ".png"))
      .then(function() {
        console.log("Transcoding finished");
        const extensions = [".webm", ".mp4", ".ogv", ".png", "-audio.mp4"];

        return Promise.all(
          extensions.map(function(fmt) {
            const localFilename = outputFilename + fmt;
            const options = { destination: outputStorageName + fmt };

            if (fmt === "-audio.mp4") {
              options.metadata = { contentType: "audio/mp4" };
            }

            function doUpload() {
              return destinationBucket.upload(localFilename, options);
            }

            return doWithRetries(doUpload, 5).then(() => {
              console.log("Finished uploading", fmt);
              // The unlink is done asynchronously, and there's no need to wait
              // for it to finish. Also, errors aren't really important other
              // than logging.
              fs.unlink(localFilename, function(err) {
                if (err) {
                  console.warn("Error unlinking", localFilename, err);
                }
              });
            });
          })
        );
      })
      .then(function() {
        database()
          .ref("video-clips")
          .child(clipId)
          .child("transcodedAt")
          .set(database.ServerValue.TIMESTAMP);
      })
  );
}

function waitForFileToExist(filename) {
  let checks = 10;
  const sleepTime = 100;
  return new Promise((resolve, reject) => {
    function check(exists) {
      if (exists) {
        resolve();
      } else {
        if (--checks === 0) {
          reject("Timed out waiting for " + filename);
        } else {
          setTimeout(() => fs.exists(filename, check), sleepTime);
        }
      }
    }

    fs.exists(filename, check);
  });
}

function transcode(inputFilename, outputDirectory, baseFilename) {
  const fullPath = path.join(outputDirectory, baseFilename);

  const fps = 24;

  return new Promise((resolve, reject) => {
    ffmpeg(inputFilename)
      .output(fullPath + "-audio.mp4")
      .audioCodec("aac")
      .noVideo()
      .format("mp4")
      // Note: I left the audio codecs commented out, in case we ever want them
      // for some reason. For now, there's no need to keep audio in the videos
      .size("?x150")
      .output(fullPath + ".mp4")
      //.audioCodec('aac')
      .noAudio()
      .videoCodec("libx264")
      .fps(fps)
      .format("mp4")
      .output(fullPath + ".webm")
      //.audioCodec('libvorbis')
      .noAudio()
      .videoCodec("libvpx")
      .fps(fps)
      .format("webm")
      .output(fullPath + ".ogv")
      //.audioCodec('libvorbis')
      .noAudio()
      .videoCodec("libtheora")
      .fps(fps)
      .format("ogv")
      .screenshots({
        count: 1,
        filename: baseFilename + ".png",
        folder: outputDirectory,
        timemarks: [0],
        size: "?x150"
      })
      // .on('start', function(commandLine) {
      //   console.log('Spawned Ffmpeg with command: ' + commandLine);
      // })
      .on("end", resolve)
      .on("error", function(error, stdout, stderr) {
        console.log("stdout", stdout);
        console.error("stderr", stderr);
        reject(error);
      })
      .run();
  });
}

function waitFor(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

function doWithRetries(fn, retries) {
  return fn().catch(err => {
    if (retries === 0) {
      throw err;
    } else {
      console.error(err);
      console.log("Retrying in 5 seconds");
      return waitFor(5000).then(() => doWithRetries(fn, retries - 1));
    }
  });
}

module.exports = runTranscodeJob;
