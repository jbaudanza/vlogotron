import PropTypes from "prop-types";
import React from "react";

export default class SynchronizedVideo extends React.Component {
  constructor() {
    super();
    this.setVideoElement = this.setVideoElement.bind(this);
    this.onDurationChange = this.onDurationChange.bind(this);
    this.isPlaying = false;
  }

  componentWillMount() {
    if (this.props.playbackStartedAt) {
      this.startPlayback();
    }
  }

  resetStartPosition() {
    if (this.videoEl && this.videoEl.duration && !this.isPlaying) {
      const offset = this.props.trimStart * this.videoEl.duration;
      this.videoEl.currentTime = offset;
    }
  }

  onDurationChange(event) {
    this.resetStartPosition();
  }

  componentDidUpdate(prevProps, prevState) {
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
      const offset = this.props.trimStart * this.videoEl.duration;

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

  setVideoElement(el) {
    this.videoEl = el;
    this.isPlaying = false;
  }

  render() {
    return (
      <video
        playsInline
        muted
        poster={this.props.videoClip.poster}
        ref={this.setVideoElement}
        width={this.props.width}
        onDurationChange={this.onDurationChange}
      >
        {this.props.videoClip.sources.map(props => (
          <source {...props} key={props.type} />
        ))}
      </video>
    );
  }
}

SynchronizedVideo.propTypes = {
  videoClip: PropTypes.object.isRequired,
  playbackStartedAt: PropTypes.number,
  trimStart: PropTypes.number.isRequired,
  audioContext: PropTypes.object.isRequired
};

SynchronizedVideo.defaultProps = {
  trimStart: 0
};
