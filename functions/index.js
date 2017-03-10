const functions = require('firebase-functions');

const doTranscodeJob = require('./transcoder');

const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);

exports.transcodeVideo = functions.storage.object().onChange(event => {
  // TODO: We generating a lot of extra log entries for the storage events that
  // don't match. Perhaps we should move uploads into their own bucket.
  if (event.data.name.startsWith('uploads/') && 
      event.data.resourceState === 'exists') {
    return doTranscodeJob(event.data.bucket, event.data.name, admin.database());
  }
});
