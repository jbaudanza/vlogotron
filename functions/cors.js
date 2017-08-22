/* @flow */

const allowedOrigins = [
  "http://localhost:5000",
  "https://www.vlogotron.com",
  "https://staging.vlogotron.com",
  "https://vlogotron-95daf.firebaseapp.com",
  "https://www.vlogotron"
];

function cors(
  req /*: ExpressRequest */,
  res /*: http$ServerResponse */,
  next /*: Function */
) {
  // Set CORS headers
  if (allowedOrigins.indexOf(req.headers.origin) !== -1) {
    res.setHeader("Access-Control-Allow-Origin", req.headers.origin);
  }

  // NOTE: If we can get content-type to be one of the standard ones, we can
  // remove it from this list. Standard ones include:
  //   application/x-www-form-urlencoded, multipart/form-data, or text/plain
  res.setHeader(
    "Access-Control-Allow-Headers",
    "content-type,x-requested-with,authorization"
  );

  if (req.method === "OPTIONS") {
    res.writeHead(200, { Allow: "OPTIONS, POST" });
    res.end();
  } else {
    next();
  }
}

module.exports = cors;
