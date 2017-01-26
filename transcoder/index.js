// TODO:
//   - lower video quality
//   - Update real time db somehow
//   - How best to reencode all videos, if we decide to
//   - Cleanup tmp files

const os = require('os');
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

// TODO: I think the rules section for the database needs to be tigheter
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

  try {
  bucket.file(inputStorageName)
      .download({destination: inputFilename})
      .then(() => transcode(inputFilename, outputFilename))
      .then(function() {
        logger.info('Transcoding finished')
        return Promise.all(['.webm', '.mp4', '.ogv'].map(function(fmt) {
          // TODO: Should we include a mime-type here?
          return bucket.upload(outputFilename + fmt, {
              destination: outputStorageName + fmt,
              predefinedAcl: 'publicRead'
          });
        }));
      })
      .then(function() {
        logger.info('Upload finished')
        resolve();
      }, function(err) {
        logger.error(err);
        reject(err);
      });
  } catch(e) { console.log(e); }
});


function transcodeHelper(inputFilename, outputFilename, format, audioCodec, videoCodec) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputFilename)
      .output(outputFilename + "." + format)
      .audioCodec(audioCodec)
      .videoCodec(videoCodec)
      .size('?x150')
      .format(format)
      .on('end', resolve)
      .on('error', reject)
      .run();
  });
}

function transcode(inputFilename, outputFilename) {
  // TODO: We could theoretically do a ffmpeg command with multiple outputs,
  // but when I do this the audio comes out glitchy.
  return transcodeHelper(inputFilename, outputFilename, 'mp4', 'aac', 'libx264')
    .then(() => transcodeHelper(inputFilename, outputFilename, 'webm', 'libvorbis', 'libvpx'))
    .then(() => transcodeHelper(inputFilename, outputFilename, 'ogv', 'libvorbis', 'libtheora'));
}

process.on('SIGINT', function() {
  logger.info('Starting worker shutdown');
  queue.shutdown().then(function() {
    logger.info('Finished worker shutdown');
    process.exit(0);
  });
});
