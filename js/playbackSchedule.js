import { Observable } from "rxjs/Observable";

const schedule$ = Observable.merge(
  // Run the scheduler once on startup
  Observable.of({}),
  // And then run it again at even intervals
  Observable.interval(0.5 * 1000),
  // Run the schedule once before the window goes blurred
  Observable.fromEvent(window, "blur")
);

/* Returns an Observable of timestamps. These timestamps represent how far
   in the future the app should be scheduling audio playback. */
export function playbackSchedule(audioContext) {
  return schedule$
    .map(() => audioContext.currentTime + (document.hasFocus() ? 1.0 : 2.0))
    .scan(Math.max, audioContext.currentTime)
    .distinctUntilChanged();
}
