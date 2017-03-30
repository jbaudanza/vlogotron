import {Observable} from 'rxjs/Observable';

export default function recordVideosController(params, actions, subscription) {
  return Observable.of({loading: true, videoClips: {}, playCommands$: Observable.never(), isPlaying: false, songLength: 0, playbackPositionInSeconds: 0, songName: ''});
}
