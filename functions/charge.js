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
  description: "Premium songs",
  metadata: { songId: "chopsticks" } // TODO: Use real songId
};

const allowedOrigins = [
  "http://localhost:5000",
  "https://www.vlogotron.com",
  "https://staging.vlogotron.com",
  "https://vlogotron-95daf.firebaseapp.com",
  "http://localhost:5000",
  "https://www.vlogotron"
];

function charge(admin, req, res) {
  // Set CORS headers
  if (allowedOrigins.indexOf(req.headers.origin) !== -1) {
    res.setHeader("Access-Control-Allow-Origin", req.headers.origin);
  }
  res.setHeader("Access-Control-Allow-Headers", "content-type");

  if (req.method === "OPTIONS") {
    res.setHeader("allow", "OPTIONS, POST");
    res.status(200).send("");
    return;
  }

  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  if (typeof req.body !== "object") {
    res.status(400).send("Expected parameters in request body");
    return;
  }

  if (typeof req.body.jwt !== "string") {
    res.status(400).send("Expected jwt parameter in request body");
    return;
  }

  if (typeof req.body.token !== "string") {
    res.status(400).send("Expected token parameter in request body");
    return;
  }

  admin.auth().verifyIdToken(req.body.jwt).then(decodedToken => {
    const uid = decodedToken.uid;
    const dbRef = admin.database().ref("stripe-customers").child(uid);
    const customerIdRef = dbRef.child("customerId");

    let chargePromise;

    customerIdRef.once("value", function(snapshot) {
      if (snapshot.exists()) {
        console.log("Completing purchase with stored customer id for uid", uid);

        const customerId = snapshot.val();
        chargePromise = stripe.customers
          .createSource(customerId, { source: req.body.token })
          .then(source => {
            return stripe.charges.create(
              Object.assign({}, chargeOptions, {
                customer: customerId,
                source: source.id
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
              Object.assign({}, chargeOptions, { customer: customer.id })
            );
          });
      }

      chargePromise.then(charge => {
        dbRef.child("premium").set(true);
        res.status(200).send(JSON.stringify(charge));
      });
    });
  });
}

module.exports = charge;
