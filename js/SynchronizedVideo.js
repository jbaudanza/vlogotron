import PropTypes from "prop-types";
import React from "react";

export default class SynchronizedVideo extends React.Component {
  componentWillMount() {
    if (this.props.playbackStartedAt) {
      this.startPlayback();
    }
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
  }

  startPlayback() {
    if (this.videoEl) {
      this.videoEl.currentTime = 0;
      const promise = this.videoEl.play();

      // Older version of FF don't return a promise
      if (promise) {
        promise
          .then(() => {
            // Try to compensate for any delay in starting the video
            if (this.props.playbackStartedAt) {
              const delta =
                this.props.audioContext.currentTime -
                this.props.playbackStartedAt;
              if (delta > 0 && this.videoEl) {
                this.videoEl.currentTime = delta;
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
    }
  }

  render() {
    return (
      <video
        playsInline
        muted
        poster={this.props.videoClip.poster}
        ref={el => this.videoEl = el}
        width={this.props.width}
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
  audioContext: PropTypes.object.isRequired
};
