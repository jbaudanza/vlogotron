import { Observable } from "rxjs/Observable";

import playbackController from "./playbackController";

import { songLengthInSeconds } from "./song";

export default function songEditorController(
  params,
  actions,
  currentUser$,
  subscription
) {
  return playbackController(
    { uid: "b7Z6g5LFN7SiyJpAnxByRmuSHuV2" },
    actions,
    currentUser$,
    subscription
  );
}
