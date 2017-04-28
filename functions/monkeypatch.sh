# This is a pretty gross monkey patch to get the google storage client to stop
# using the forever-agent, which will timeout on google cloud functions
#
# We should follow this issue an un-monkeypatch if appropriate:
# https://issuetracker.google.com/issues/36667671
#
echo "Monkeypatching node_modules/@google-cloud/common/src/util.js"
sed -i .bak  "s/forever: true/forever: false/" "/user_code/node_modules/@google-cloud/common/src/util.js"
