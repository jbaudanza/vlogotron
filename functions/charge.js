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

function sendJSON(res, code, responseObject) {
  res.writeHead(code, { "Content-Type": "application/json" });
  res.end(JSON.stringify(responseObject));
}

function charge(
  admin /*: Object */,
  req /*: ExpressRequest */,
  res /*:http$ServerResponse */
) {
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.end("Method Not Allowed");
    return;
  }

  if (!req.user) {
    res.writeHead(401, {
      "WWW-Authenticate": "Bearer"
    });
    res.end("Expected Authorization header with JSON Web Token");
    return;
  }
  const user = req.user;

  if (typeof req.body !== "object") {
    res.statusCode = 400;
    res.end("Expected parameters in request body");
    return;
  }

  if (typeof req.body.token !== "string") {
    res.statusCode = 400;
    res.end("Expected token parameter in request body");
    return;
  }

  console.log("Handling Charge request from IP: ", req.ip);

  const uid = user.uid;
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
          email: user.email,
          source: req.body.token,
          description: user.name,
          metadata: { uid: user.uid }
        })
        .then(customer => {
          customerIdRef.set(customer.id);
          dbRef.child("timestamp").set(admin.database.ServerValue.TIMESTAMP);
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

module.exports = charge;
