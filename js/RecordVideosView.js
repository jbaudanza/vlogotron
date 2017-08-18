/* @flow */
import PropTypes from "prop-types";
import * as React from "react";
import styled from "styled-components";

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
import PageHeaderAction from "./PageHeaderAction";
import CreateNewSongOverlay from "./CreateNewSongOverlay";

import { notes } from "./VideoGrid";

import type { SongBoardEvent } from "./database";
import type { Observable } from "rxjs/Observable";
import type { Subscription } from "rxjs/Subscription";
import type { SongId } from "./song";

type Props = {
  actions: Object,
  currentUser: Object,
  onNavigate: Function,
  loading: Object,
  videoClips: Object,
  playCommands$: Observable<Object>,
  songTitle: string,
  location: Location,
  countdownUntilRecord: number,
  pitchCorrection: number,
  noteBeingRecorded: string,
  durationRecorded: number,
  mediaStream: ?MediaStream,
  onClearVideoClip: Function,
  onStartRecording: Function,
  onStopRecording: Function,
  onPause: Function,
  onPlay: Function,
  playbackPositionInSeconds: number,
  authorName: string,
  songLength: number,
  isPlaying: boolean,
  premiumAccountStatus: boolean,
  onDismissError: Function,
  audioSources: { [string]: Object },
  authorPhotoUrl: string,
  origin: string,
  songBoardId: string
};

export default class RecordVideosView extends React.Component<Props> {
  constructor() {
    super();
    bindAll(this, "bindVideoGrid", "onTrim", "onSelectSong");
  }

  subscription: Subscription;

  bindVideoGrid(component: ?Object) {
    if (component) {
      this.subscription = component.playCommands$$.subscribe(
        this.props.actions.subjects.playCommands$$
      );
    } else {
      if (this.subscription) this.subscription.unsubscribe();
    }
  }

  updateSongBoard(event: SongBoardEvent) {
    this.props.actions.subjects.editSong$.next(event);
  }

  onTrim(note: string) {
    this.props.onNavigate("#trim?note=" + note);
  }

  onSelectSong(songId: SongId) {
    this.updateSongBoard({
      type: "update-song",
      songId: songId,
      uid: this.props.currentUser.uid
    });
    this.props.onNavigate(this.props.location.pathname);
  }

  onFinishTrim(note: string, trimStart: number, trimEnd: number) {
    this.updateSongBoard({
      type: "update-trim",
      note,
      trimStart,
      trimEnd,
      uid: this.props.currentUser.uid
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
        <CreateNewSongOverlay
          onClose={this.props.location.pathname}
          onSelectSong={this.onSelectSong}
          currentUser={this.props.currentUser}
          premiumAccountStatus={this.props.premiumAccountStatus}
        />
      );
    }

    if (this.props.location.hash === "#share") {
      overlay = (
        <ShareOverlay
          onClose={this.props.location.pathname}
          origin={this.props.origin}
          songBoardId={this.props.songBoardId}
        />
      );
    }

    const emptyCount =
      notes.length -
      intersection(Object.keys(this.props.videoClips), notes).length;

    return (
      <div className="page-vertical-wrapper record-videos-page">
        <PageHeader
          isPlaying={this.props.isPlaying}
          songTitle={this.props.songTitle}
          songLength={this.props.songLength}
          authorName={this.props.authorName}
          loading={loadingAsBool}
          playbackPositionInSeconds={this.props.playbackPositionInSeconds}
          onClickPlay={this.props.onPlay}
          onClickPause={this.props.onPause}
        >
          <div className="actions">
            <PageHeaderAction href="#choose-song">
              Change melody
            </PageHeaderAction>

            <PageHeaderAction>
              Delete
            </PageHeaderAction>
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
                <NewSongBoardNotification
                  authorName={this.props.authorName}
                  photoUrl={this.props.authorPhotoUrl}
                />
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

const CameraIconWrapper = styled.span`
  display: inline-block;
  width: 20px;
  height: 10px;
  overflow: hidden;
  margin: 0 2px;

  svg {
    margin-top: -5px;
    stroke: #333;
  }
`;

function CameraIcon(props) {
  return (
    <CameraIconWrapper>
      <svg version="1.1" width="20px" height="25px">
        <use xlinkHref="#svg-camera" />
      </svg>
    </CameraIconWrapper>
  );
}

function CollabIntroNotification(
  props: { photoUrl: string, authorName: string }
) {
  return (
    <NotificationPopup photoUrl={this.props.authorPhotoUrl}>
      <p>
        {this.props.authorName}
        {" "}
        needs your help finishing this song. Pick a square
        with a robot in it and click the
        <CameraIcon /> icon
        to replace the robot with your own voice.
      </p>
      <p>
        Watch this
        {" "}
        <a href="http://www.example.com">Tutorial video</a>
        {" "}
        for more instructions.
      </p>
    </NotificationPopup>
  );
}

function NewSongBoardNotification(props) {
  return (
    <NotificationPopup>
      <p>
        You just created a new song! Make it your own by recording your own
        voice over the robots. Get started by picking a square
        and clicking the
        <CameraIcon /> icon.
      </p>
      <p>
        Watch this
        {" "}
        <a href="http://www.example.com">Tutorial video</a>
        {" "}
        for more instructions.
      </p>
    </NotificationPopup>
  );
}
