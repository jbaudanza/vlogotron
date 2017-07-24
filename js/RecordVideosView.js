import PropTypes from "prop-types";
import React from "react";

import { bindAll, bindKey, forEach, intersection, isEmpty } from "lodash";

import RecordingNotSupported from "./RecordingNotSupported";
import VideoGrid from "./VideoGrid";
import PageHeader from "./PageHeader";
import PageTextFooter from "./PageTextFooter";
import LoginOverlay from "./LoginOverlay";
import TrimOverlay from "./TrimOverlay";
import ShareOverlay from "./ShareOverlay";
import NotificationPopup from "./NotificationPopup";
import ChooseSongOverlay from "./ChooseSongOverlay";
import SubHeader from "./SubHeader";
import Link from "./Link";

import { notes } from "./VideoGrid";

export default class RecordVideosView extends React.Component {
  constructor() {
    super();
    bindAll(this, "bindVideoGrid", "onChangeTitle", "onTrim", "onChooseSong");
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

  onTrim(note) {
    this.props.onNavigate("#trim?note=" + note);
  }

  onChooseSong(song) {
    this.props.actions.subjects.editSong$.next({
      action: "replace-all",
      notes: song.notes
    });
    this.props.onNavigate(this.props.location.pathname);
  }

  onFinishTrim(note, trimStart, trimEnd) {
    this.props.actions.subjects.editSong$.next({
      action: "change-trim",
      note,
      trimStart,
      trimEnd
    });

    // Dismiss the overlay
    this.props.onNavigate(this.props.location.pathname);
  }

  render() {
    const loadingAsBool = !isEmpty(this.props.loading);

    let footer;
    if (this.props.error) {
      footer = (
        <PageTextFooter
          error
          text={this.context.messages[this.props.error]()}
          onDismissError={this.props.onDismissError}
        />
      );
    } else {
      footer = (
        <PageTextFooter
          text={this.context.messages["record-videos-tip-long"]()}
          onDismissError={this.props.onDismissError}
        />
      );
    }

    let overlay;
    if (!this.props.currentUser && this.props.supported) {
      overlay = <LoginOverlay onLogin={this.props.onLogin} onClose="/" />;
    }

    let match;
    if ((match = this.props.location.hash.match(/^#trim\?note=([\w]+)/))) {
      const note = match[1];
      if (
        this.props.videoClips[note] &&
        this.props.audioSources[note] &&
        this.props.audioSources[note].audioBuffer
      ) {
        overlay = (
          <TrimOverlay
            onClose={this.props.location.pathname}
            videoClip={this.props.videoClips[note]}
            audioBuffer={this.props.audioSources[note].audioBuffer}
            trimStart={this.props.audioSources[note].trimStart}
            trimEnd={this.props.audioSources[note].trimEnd}
            onFinish={this.onFinishTrim.bind(this, note)}
          />
        );
      }
    }

    if (this.props.location.hash === "#choose-song") {
      overlay = (
        <ChooseSongOverlay
          onSelect={this.onChooseSong}
          media={this.props.media}
          onClose={this.props.location.pathname}
          bpm={this.props.bpm}
        />
      );
    }

    if (this.props.location.hash === "#share") {
      overlay = <ShareOverlay onClose={this.props.location.pathname} />;
    }

    const emptyCount =
      notes.length -
      intersection(Object.keys(this.props.videoClips), notes).length;

    return (
      <div className="page-vertical-wrapper record-videos-page">
        <PageHeader
          isPlaying={this.props.isPlaying}
          songTitle={this.props.songTitle}
          onChangeTitle={this.onChangeTitle}
          songLength={this.props.songLength}
          authorName={this.props.authorName}
          loading={loadingAsBool}
          playbackPositionInSeconds={this.props.playbackPositionInSeconds}
          onClickPlay={this.props.onPlay}
          onClickPause={this.props.onPause}
        >
          <div className="actions">
            <Link href="#choose-song" className="action">
              Change melody
            </Link>

            <Link className="action">
              Delete
            </Link>
          </div>
        </PageHeader>
        <div className="page-content">
          {this.props.supported
            ? <div>
                <SubHeader>
                  <span>
                    {this.context.messages["sub-header-tip-for-op"]({
                      EMPTY_COUNT: emptyCount
                    })}
                  </span>
                  {" "}
                  <a href="#share">
                    Copy link to share
                  </a>
                </SubHeader>
                <VideoGrid
                  readonly
                  videoClips={this.props.videoClips}
                  playCommands$={this.props.playCommands$}
                  readonly={false}
                  loading={this.props.loading}
                  onStartRecording={this.props.onStartRecording}
                  onStopRecording={this.props.onStopRecording}
                  onClear={this.props.onClearVideoClip}
                  onTrim={this.onTrim}
                  mediaStream={this.props.mediaStream}
                  countdownUntilRecord={this.props.countdownUntilRecord}
                  durationRecorded={this.props.durationRecorded}
                  noteBeingRecorded={this.props.noteBeingRecorded}
                  pitchCorrection={this.props.pitchCorrection}
                  ref={this.bindVideoGrid}
                />
                <NotificationPopup />
              </div>
            : <RecordingNotSupported />}

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
  songTitle: PropTypes.string.isRequired,
  onNavigate: PropTypes.func.isRequired,
  location: PropTypes.object.isRequired
};
