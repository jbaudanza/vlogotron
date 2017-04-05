// Use a reference counting scheme to a higher order stream of playback streams
// into one unified stream to control playback.
export function combine(playCommands$$) {
  return playCommands$$
      .mergeAll()
      .scan(reduceMultipleCommandStreams, {refCounts: {}})
      .map(x => x.command);
}

function reduceMultipleCommandStreams(last, command) {
  const nextCommand = {};

  if (command.play && !last.refCounts[command.play]) {
    nextCommand.play = command.play;
  }

  if (command.pause && last.refCounts[command.pause] === 1) {
    nextCommand.pause = command.pause;
  }

  let refCounts = last.refCounts;
  if (command.play) {
    refCounts = adjustRefCount(refCounts, command.play, +1);
  }

  if (command.pause) {
    refCounts = adjustRefCount(refCounts, command.pause, -1);
  }

  return {
    refCounts: refCounts,
    command: nextCommand
  };
}

function adjustRefCount(countObject, key, change) {
  return Object.assign(
      {},
      countObject,
      {[key]: (countObject[key] || 0) + change}
  );
}
