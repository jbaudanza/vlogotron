/* @flow */
const functions = require("firebase-functions");

let stripeSecretKey;
if ("stripe" in functions.config()) {
  stripeSecretKey = functions.config().stripe.token;
} else {
  console.warn("Using development Stripe key");
  stripeSecretKey = "sk_test_t8RlYNrFGhxkLBme6LuTnJqi";
}
const stripe = require("stripe")(stripeSecretKey);

const chargeOptions = {
  amount: 199,
  currency: "usd",
  description: "Premium songs"
};

const allowedOrigins = [
  "http://localhost:5000",
  "https://www.vlogotron.com",
  "https://staging.vlogotron.com",
  "https://vlogotron-95daf.firebaseapp.com",
  "https://www.vlogotron"
];

function sendJSON(res, code, responseObject) {
  res.writeHead(code, { "Content-Type": "application/json" });
  res.end(JSON.stringify(responseObject));
}

function sendAuthError(res, errorMessage) {
  res.writeHead(401, {
    "WWW-Authenticate": "Bearer"
  });
  res.end(errorMessage);
}

function charge(
  admin /*: Object */,
  req /*: ExpressRequest */,
  res /*:http$ServerResponse */
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
    return;
  }

  if (req.method !== "POST") {
    res.statusCode = 405;
    res.end("Method Not Allowed");
    return;
  }

  if (typeof req.body !== "object") {
    res.statusCode = 400;
    res.end("Expected parameters in request body");
    return;
  }

  if (!req.headers.authorization) {
    sendAuthError(res, "Expected Authorization header with JSON Web Token");
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

  if (typeof req.body.token !== "string") {
    res.statusCode = 400;
    res.end("Expected token parameter in request body");
    return;
  }

  console.log("Handling Charge request from IP: ", req.ip);

  function onInvalidToken() {
    console.warn("JSON Web Token didn't validate");
    res.statusCode = 400;
    res.end("JSON Web Token didn't validate");
    return;
  }

  function onValidToken(decodedToken) {
    const uid = decodedToken.uid;
    const dbRef = admin.database().ref("stripe-customers").child(uid);
    const customerIdRef = dbRef.child("customerId");

    let chargePromise;

    customerIdRef.once("value", function(snapshot) {
      if (snapshot.exists()) {
        console.log("Found existing customer id for uid", uid);

        const customerId = snapshot.val();
        chargePromise = stripe.customers
          .createSource(customerId, { source: req.body.token })
          .then(source => {
            return stripe.charges.create(
              Object.assign({}, chargeOptions, {
                customer: customerId,
                source: source.id,
                metadata: req.body.metadata
              })
            );
          });
      } else {
        console.log("Creating stripe customer for uid", uid);

        chargePromise = stripe.customers
          .create({
            email: decodedToken.email,
            source: req.body.token,
            description: decodedToken.name,
            metadata: { uid: decodedToken.uid }
          })
          .then(customer => {
            customerIdRef.set(customer.id);
            return customer;
          })
          .then(customer => {
            return stripe.charges.create(
              Object.assign({}, chargeOptions, {
                customer: customer.id,
                metadata: req.body.metadata
              })
            );
          });
      }

      chargePromise.then(
        charge => {
          dbRef.child("premium").set(true);
          console.log("Charge completed");
          sendJSON(res, 200, charge);
        },
        error => {
          console.log("Charge failed", error.message);
          sendJSON(res, 402, error);
        }
      );
    });
  }

  admin.auth().verifyIdToken(jwt).then(onValidToken, onInvalidToken);
}

module.exports = charge;
