/* @flow */
import React from "react";

export default class SynchronizedVideo extends React.Component {
  props: {
    videoClip: Object,
    playbackStartedAt: ?number,
    width: number,
    trimStart: number,
    audioContext: AudioContext
  };
  static defaultProps: Object;
  isPlaying: boolean;
  videoEl: HTMLMediaElement;

  constructor() {
    super();
    this.isPlaying = false;
  }

  componentWillMount() {
    if (this.props.playbackStartedAt) {
      this.startPlayback();
    }
  }

  resetStartPosition() {
    if (this.videoEl && isFinite(this.videoEl.duration) && !this.isPlaying) {
      const offset = this.props.trimStart * this.videoEl.duration;
      this.videoEl.currentTime = offset;
    }
  }

  onDurationChange(event: Event) {
    this.resetStartPosition();
  }

  componentDidUpdate(prevProps: Object) {
    if (prevProps.playbackStartedAt && this.props.playbackStartedAt == null) {
      this.stopPlayback();
    }

    if (
      prevProps.playbackStartedAt == null &&
      this.props.playbackStartedAt != null
    ) {
      this.startPlayback();
    }

    if (prevProps.trimStart != this.props.trimStart) {
      this.resetStartPosition();
    }
  }

  startPlayback() {
    if (this.videoEl) {
      // It seems that local videos stored in a blob have the duration
      // attribute set to Infinity. This might be a problem when trimming
      // videos
      let offset;
      if (isFinite(this.videoEl.duration)) {
        offset = this.props.trimStart * this.videoEl.duration;
      } else {
        offset = 0;
      }

      this.videoEl.currentTime = offset;
      const promise = this.videoEl.play();
      this.isPlaying = true;

      // Older versions of Firefox don't return a promise
      if (promise) {
        promise
          .then(() => {
            // Try to compensate for any delay in starting the video
            if (this.props.playbackStartedAt) {
              const delta =
                this.props.audioContext.currentTime -
                this.props.playbackStartedAt;

              if (delta > 0 && this.videoEl) {
                this.videoEl.currentTime = offset + delta;
              }
            }
          })
          .catch(function(e) {
            // 20 = AbortError.
            // This can happen if we try to pause playback before it starts. This
            // can safely be ignored. It results in errors that look like:
            //
            //   The play() request was interrupted by a call to pause()
            //
            if (e.code !== 20) {
              throw e;
            }
          });
      }
    }
  }

  stopPlayback() {
    if (this.videoEl) {
      this.videoEl.pause();
      this.videoEl.currentTime = 0;
      this.isPlaying = false;
      this.resetStartPosition();
    }
  }

  setVideoElement(el: HTMLMediaElement) {
    this.videoEl = el;
    this.isPlaying = false;
  }

  render() {
    return (
      <video
        key={this.props.videoClip.clipId}
        playsInline
        muted
        poster={this.props.videoClip.poster}
        ref={this.setVideoElement.bind(this)}
        width={this.props.width}
        onDurationChange={this.onDurationChange.bind(this)}
      >
        {this.props.videoClip.sources.map(props => (
          <source {...props} key={props.type} />
        ))}
      </video>
    );
  }
}

SynchronizedVideo.defaultProps = {
  trimStart: 0
};
