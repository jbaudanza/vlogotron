/* @flow */

function sendAuthError(res, errorMessage) {
  res.writeHead(401, {
    "WWW-Authenticate": "Bearer"
  });
  res.end(errorMessage);
}

function auth(
  admin /*: Object */,
  req /*: ExpressRequest */,
  res /*: http$ServerResponse */,
  next /*: Function */
) {
  if (!req.headers.authorization) {
    next();
    return;
  }

  const authParts = req.headers.authorization.split(" ");

  if (authParts.length !== 2) {
    sendAuthError(res, "Unable to parse Authorization header");
    return;
  }

  if (authParts[0] !== "Bearer") {
    sendAuthError(res, "Expected Authorization header to include Bearer token");
    return;
  }

  const jwt = authParts[1];

  function onInvalidToken() {
    console.warn("JSON Web Token didn't validate");
    res.statusCode = 400;
    res.end("JSON Web Token didn't validate");
    return;
  }

  function onValidToken(decodedToken) {
    req.user = decodedToken;
    next();
  }

  admin.auth().verifyIdToken(jwt).then(onValidToken, onInvalidToken);
}

module.exports = auth;
