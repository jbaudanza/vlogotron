/* @flow */

export function formatSeconds(durationInSeconds: number): string {
  if (!isFinite(durationInSeconds)) return "";

  const minutes = String(Math.floor(durationInSeconds / 60));
  let seconds = String(Math.floor(durationInSeconds) % 60);

  if (seconds.length === 1) seconds = "0" + seconds;

  return minutes + ":" + seconds;
}
