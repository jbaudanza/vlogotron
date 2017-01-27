// TODO:
//   - lower video quality
//   - Cleanup tmp files

const os = require('os');
const fs = require('fs');
const path = require('path');
const process = require('process');
const ffmpeg = require('fluent-ffmpeg');

const winston = require('winston');
const Queue = require('firebase-queue');
const admin = require('firebase-admin');
const gcloud = require('google-cloud');

admin.initializeApp({
  credential: admin.credential.cert("./serviceAccountKey.json"),
  databaseURL: "https://vlogotron-95daf.firebaseio.com"
});

const gcs = gcloud.storage({
  projectId: 'vlogotron-95daf',
  keyFilename: './serviceAccountKey.json'
});

const bucket = gcs.bucket('vlogotron-95daf.appspot.com');

const logger = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)({timestamp:true, level: 'debug'})
  ]
});

logger.info('Starting transcoder worker');

const ref = admin.database().ref('queue');

let jobCount = 0;
const tempDir = os.tmpdir();


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

// TODO: I think the rules section for the database needs to be tighter
const queue = new Queue(ref, function(data, progress, resolve, reject) {

  logger.info('Starting job', data);

  const filenamePrefix = `transcoder-${process.pid}-${jobCount}`;
  const inputFilename = path.join(tempDir, filenamePrefix + '-input');
  const outputFilename = path.join(tempDir, filenamePrefix);

  jobCount++;

  logger.debug("Input file " + inputFilename)
  logger.debug("Output file " + outputFilename)

  const inputStorageName =  'uploads/' + data.uid + '/' + data.clipId;
  const outputStorageName = 'video-clips/' + data.uid + '/' + data.clipId;

  bucket.file(inputStorageName)
      .download({destination: inputFilename})
      .then(() => transcode(inputFilename, tempDir, filenamePrefix))
      // This is kind of a hack. It seems like the ffmpeg process takes a little
      // while to shutdown and close out the file description. So we have to
      // poll to make sure it's ready before uploading.
      .then(() => waitForFileToExist(outputFilename + ".png"))
      .then(function() {
        logger.info('Transcoding finished')
        return Promise.all(['.webm', '.mp4', '.ogv', '.png'].map(function(fmt) {
          // TODO: Should we include a mime-type here?
          // Note that we don't want to specify any ACL here. Let it inherit
          // the default bucket ACL that is set by firebase
          return bucket.upload(outputFilename + fmt, {
              destination: outputStorageName + fmt
          });
        }));
      })
      .then(function() {
        admin.database().ref('video-clip-events')
          .child(data.uid)
          .push({type: 'transcoded', clipId: data.clipId});
      })
      .then(function() {
        logger.info('Upload finished')
        resolve();
      }, function(err) {
        logger.error(err);
        reject(err);
      });
});


function transcode(inputFilename, outputDirectory, baseFilename) {

  const fullPath = path.join(outputDirectory, baseFilename);

  return new Promise((resolve, reject) => {
    ffmpeg(inputFilename)
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

      .on('end', resolve)
      .on('error', reject)
      .run();
  });
}

process.on('SIGINT', function() {
  logger.info('Starting worker shutdown');
  queue.shutdown().then(function() {
    logger.info('Finished worker shutdown');
    process.exit(0);
  });
});
