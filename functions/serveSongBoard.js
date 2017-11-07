/* @flow */
const path = require('path');

function createVideoClip(
  req /*: ExpressRequest */,
  res /*: ExpressResponse */
) {
  if (req.method !== "GET") {
    res.sendStatus(405);
    return;
  }

  res.statusCode = 200;
  res.sendFile(path.join(__dirname, 'songboard.html'))
}

module.exports = createVideoClip;
