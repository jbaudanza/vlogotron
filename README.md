# install dependencies

    yarn

# Bundle JS

    ./node_modules/.bin/webpack --watch

# Run locally

    npm start

# Deployment

    npm install -g firebase-tools
    firebase login
    firebase deploy

# Configuring CORS

    gsutil cors set cors.json gs://vlogotron-95daf.appspot.com/
