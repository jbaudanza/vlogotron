import PropTypes from 'prop-types';
import React from "react";

import { bindAll, bindKey, forEach } from "lodash";

import VideoGrid from "./VideoGrid";
import SongEditorHeader from "./SongEditorHeader";
import PageTextFooter from "./PageTextFooter";
import LoginOverlay from "./LoginOverlay";

export default class RecordVideosView extends React.Component {
  constructor() {
    super();
    bindAll(this, "bindVideoGrid", "onClickLogin", "onChangeTitle");
  }

  bindVideoGrid(component) {
    if (component) {
      this.subscription = component.playCommands$$.subscribe(
        this.props.actions.subjects.playCommands$$
      );
    } else {
      if (this.subscription) this.subscription.unsubscribe();
    }
  }

  onChangeTitle(title) {
    this.props.actions.subjects.editSong$.next({
      action: "change-title",
      title: title
    });
  }

  onClickLogin() {
    this.props.onNavigate("#login");
  }

  render() {
    const callbacks = this.props.actions.callbacks;

    const nextPathname = this.props.location.pathname.replace(
      "/record-videos",
      "/note-editor"
    );

    let footer;
    if (this.props.error) {
      footer = (
        <PageTextFooter
          error
          text={this.context.messages[this.props.error]()}
          onDismissError={callbacks.onDismissError}
        />
      );
    } else {
      footer = (
        <PageTextFooter
          text={this.context.messages["record-videos-tip-long"]()}
          onDismissError={callbacks.onDismissError}
        />
      );
    }

    let overlay;
    if (!this.props.currentUser && this.props.supported) {
      overlay = <LoginOverlay onLogin={this.props.onLogin} onClose="/" />;
    }

    return (
      <div className="page-vertical-wrapper record-videos-page">
        <SongEditorHeader
          songTitle={this.props.songTitle}
          onChangeTitle={this.onChangeTitle}
          secondaryAction={{ href: "/" }}
          secondaryActionLabel={this.context.messages["cancel-action"]()}
          primaryAction={{ href: nextPathname }}
          primaryActionLabel={this.context.messages["next-action"]()}
        />

        <div className="page-content">
          {this.props.supported
            ? <VideoGrid
                readonly
                videoClips={this.props.videoClips}
                playCommands$={this.props.playCommands$}
                readonly={false}
                loading={this.props.loading}
                onStartRecording={callbacks.onStartRecording}
                onStopRecording={callbacks.onStopRecording}
                onClear={callbacks.onClearVideoClip}
                mediaStream={this.props.mediaStream}
                countdownUntilRecord={this.props.countdownUntilRecord}
                durationRecorded={this.props.durationRecorded}
                noteBeingRecorded={this.props.noteBeingRecorded}
                pitchCorrection={this.props.pitchCorrection}
                ref={this.bindVideoGrid}
              />
            : <div className="text-blob">
                <h3>Sorry, we can't record videos in your browser.</h3>

                <p>
                  We wish we could, but the Vologtron uses
                  {" "}
                  <a href="https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder">
                    technology
                  </a>
                  {" "}
                  to
                  record video and audio that isn't available in your web browser.
                </p>

                <p>
                  If you have
                  {" "}
                  <a href="https://www.google.com/chrome">Chrome</a>
                  {" "}
                  or
                  {" "}
                  <a href="https://www.mozilla.org/firefox">FireFox</a>
                  {" "}
                  installed, give
                  that a try.
                </p>
              </div>}

        </div>
        {overlay}
      </div>
    );
  }
}

RecordVideosView.contextTypes = {
  messages: PropTypes.object.isRequired
};

RecordVideosView.propTypes = {
  loading: PropTypes.object.isRequired,
  videoClips: PropTypes.object.isRequired,
  playCommands$: PropTypes.object.isRequired,
  songTitle: PropTypes.string.isRequired
};
