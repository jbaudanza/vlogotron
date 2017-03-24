# install dependencies

    yarn

# Bundle JS

    ./node_modules/.bin/webpack --watch

# Run locally

    npm start

# Deployment

    npm install -g firebase-tools
    firebase login
    firebase deploy --except functions

# Transcoder

    firebase functions:log -n 1000

    firebase deploy --only functions

    # After every deploy, the memory consumption gets set to 256MB. Go here to set it to 1GB
    # It also resets the timeout to 60 seconds. We probably want it around 120
    https://console.cloud.google.com/functions/list?project=vlogotron-95daf

# Configuring CORS

    gsutil cors set cors.json gs://vlogotron-95daf.appspot.com/
