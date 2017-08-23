# install dependencies

    yarn

# Bundle JS

    ./node_modules/.bin/webpack --watch

# Run locally

    npm start

# Deployment

    npm install -g firebase-tools
    firebase login

    # Build in production mode
    ./node_modules/.bin/webpack -p
    firebase deploy --except functions

# Transcoder

    firebase functions:log -n 1000

    firebase deploy --only functions

# Rerunning transcoder job
    https://console.cloud.google.com/functions/list?project=vlogotron-95daf

    Under the testing tab, trigger an event that looks like this:

    ```
    {
        "name": "video-clips/-Kil1E5ssCvOQg3gtmbE",
        "bucket": "vlogotron-uploads",
        "resourceState": "exists"
        "mediaLink": ""
    }
    ```

# Configuring CORS

    gsutil cors set cors.json gs://vlogotron-95daf.appspot.com/

# Configure Stripe

firebase functions:config:set stripe.token=sk_test_abcdefg
