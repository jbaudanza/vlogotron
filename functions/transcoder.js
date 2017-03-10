const os = require('os');
const fs = require('fs');
const path = require('path');
const process = require('process');
const gcs = require('@google-cloud/storage')();

const ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath(require('@ffmpeg-installer/ffmpeg').path);
ffmpeg.setFfprobePath(require('@ffprobe-installer/ffprobe').path);


let jobCount = 0;
const tempDir = os.tmpdir();

function runTranscodeJob(bucketName, inputStorageName, database) {
  console.log('Running transcoder on', inputStorageName);

  const list = inputStorageName.split('/');
  const uid = list[1];
  const clipId = list[2];

  const filenamePrefix = `transcoder-${process.pid}-${jobCount}`;

  const inputFilename = path.join(tempDir, filenamePrefix + '-input');
  const outputFilename = path.join(tempDir, filenamePrefix);

  jobCount++;

  const bucket = gcs.bucket(bucketName);

  const outputStorageName = 'video-clips/' + uid + '/' + clipId;

  return bucket.file(inputStorageName)
    .download({destination: inputFilename})
      .then(() => transcode(inputFilename, tempDir, filenamePrefix))
      // This is kind of a hack. It seems like the ffmpeg process takes a little
      // while to shutdown and close out the file description. So we have to
      // poll to make sure it's ready before uploading.
      .then(() => waitForFileToExist(outputFilename + ".png"))
      .then(function() {
        console.log('Transcoding finished');
        return Promise.all(['.webm', '.mp4', '.ogv', '.png', '-audio.mp4'].map(function(fmt) {
          // TODO: Should we include a mime-type here?
          // XXX: This is setting the wrong mime type (video/mp4) for the audio file
          // Note that we don't want to specify any ACL here. Let it inherit
          // the default bucket ACL that is set by firebase
          return bucket.upload(outputFilename + fmt, {
              destination: outputStorageName + fmt
          });
        }));
      })
      .then(function() {
        database.ref('video-clip-events')
          .child(uid)
          .push({type: 'transcoded', clipId: clipId});
      });
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
          reject('Timed out waiting for ' + filename);
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

  // TODO: Eventually the video clips shouldn't contain audio
  return new Promise((resolve, reject) => {
    ffmpeg(inputFilename)
      .output(fullPath + '-audio.mp4')
      .audioCodec('aac')
      .noVideo()
      .format('mp4')

      .size('?x150')
      .output(fullPath + '.mp4')
      .audioCodec('aac')
      .videoCodec('libx264')
      .format('mp4')

      .output(fullPath +'.webm')
      .audioCodec('libvorbis')
      .videoCodec('libvpx')
      .format('webm')

      .output(fullPath + '.ogv')
      .audioCodec('libvorbis')
      .videoCodec('libtheora')
      .format('ogv')

      .screenshots({
        count: 1,
        filename: baseFilename + '.png',
        folder: outputDirectory,
        timemarks: [0],
        size: '?x150'
      })

      // .on('start', function(commandLine) {
      //   console.log('Spawned Ffmpeg with command: ' + commandLine);
      // })
      .on('end', resolve)
      .on('error', function(error, stdout, stderr) {
        console.log('stdout', stdout)
        console.error('stderr', stderr);
        reject(error);
      })
      .run();
  });
}

module.exports = runTranscodeJob;
