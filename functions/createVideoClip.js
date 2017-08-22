/* @flow */

function sendJSON(res, code, responseObject) {
  res.writeHead(code, { "Content-Type": "application/json" });
  res.end(JSON.stringify(responseObject));
}

function createVideoClip(
  admin /*: Object */,
  req /*: ExpressRequest */,
  res /*:http$ServerResponse */
) {
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.end("Method Not Allowed");
    return;
  }

  const obj /*: Object */ = {
    note: req.body.note,
    ip: req.ip,
    timestamp: admin.database.ServerValue.TIMESTAMP
  };

  if ("sessionId" in req.body) {
    obj.sessionId = req.body.sessionId;
  }

  if ("songBoardId" in req.body) {
    obj.songBoardId = req.body.songBoardId;
  }

  if (req.user) {
    obj.uid = req.user.uid;
  }

  const databaseRef = admin.database().ref("video-clips");
  const ref = databaseRef.push(obj);

  ref.then(onWrite, onError);

  function onWrite() {
    sendJSON(res, 200, { key: ref.key });
  }

  function onError(error) {
    console.error(error);
    res.statusCode = 500;
    res.end("There was an internal error writing to the database");
  }
}

module.exports = createVideoClip;
