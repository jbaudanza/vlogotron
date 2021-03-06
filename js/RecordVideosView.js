/* @flow */
import PropTypes from "prop-types";
import * as React from "react";
import styled from "styled-components";

import { bindAll, bindKey, forEach, intersection, find } from "lodash";

import RecordingNotSupported from "./RecordingNotSupported";
import VideoGrid from "./VideoGrid";
import {
  PageHeader,
  PageHeaderAction,
  HeaderLeft,
  HeaderMiddle,
  HeaderRight,
  PlaybackControls,
  SongTitleAndAuthor
} from "./PageHeader";
import PageTextFooter from "./PageTextFooter";
import LoginOverlay from "./LoginOverlay";
import AdjustClipOverlay from "./AdjustClipOverlay";
import ShareOverlay from "./ShareOverlay";
import ChooseVideoClipOverlay from "./ChooseVideoClipOverlay";
import NotificationPopup from "./NotificationPopup";
import SubHeader from "./SubHeader";
import Message from "./Message";
import { labelToMidiNote, midiNoteToLabel } from "./midi";

import { notes } from "./VideoGrid";
import { noteEditorPath } from "./router";

import type { SongBoardEvent } from "./database";
import type { Observable } from "rxjs/Observable";
import type { Subscription } from "rxjs/Subscription";
import type { SongId } from "./song";
import type { NoteConfiguration } from "./mediaLoading";
import type { PlaybackParams } from "./AudioPlaybackEngine";

type Props = {
  actions: Object,
  currentUser: Object,
  onNavigate: Function,
  loading: Object,
  noteConfiguration: NoteConfiguration,
  playCommands$: Observable<Object>,
  songTitle: string,
  location: Location,
  countdownUntilRecord: number,
  pitchCorrection: number,
  noteBeingRecorded: number,
  durationRecorded: number,
  mediaStream?: MediaStream,
  onClearVideoClip: number => void,
  onStartRecording: number => void,
  onStopRecording: number => void,
  onPause: Function,
  onPlay: Function,
  playbackPositionInSeconds: number,
  authorName: string,
  songLength: number,
  isPlaying: boolean,
  premiumAccountStatus: boolean,
  onDismissError: Function,
  audioBuffers: { [number]: AudioBuffer },
  authorPhotoURL: string,
  origin: string,
  songBoardId: string
};

export default class RecordVideosView extends React.Component<Props> {
  constructor() {
    super();
    bindAll(this, "bindVideoGrid", "onAdjust", "onChangeTitle");
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

  onChangeTitle(title: string) {
    this.props.actions.subjects.editSong$.next({
      type: "update-title",
      title,
      uid: this.props.currentUser.uid
    });
  }

  onAdjust(note: number) {
    this.props.onNavigate("#adjust?note=" + midiNoteToLabel(note));
  }

  onFinishAdjust(note: number, playbackParams: PlaybackParams) {
    this.updateSongBoard({
      type: "update-playback-params",
      note: note,
      playbackParams,
      uid: this.props.currentUser.uid
    });

    // Dismiss the overlay
    this.props.onNavigate(this.props.location.pathname);
  }

  render() {
    // This is true if any of the values are true
    const loadingAsBool = !!find(this.props.loading);

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
    if (
      !this.props.currentUser &&
      this.props.supported &&
      !this.props.collaborateMode
    ) {
      overlay = <LoginOverlay onLogin={this.props.onLogin} />;
    }

    let match;
    if ((match = this.props.location.hash.match(/^#adjust\?note=([\w]+)/))) {
      const note = match[1];
      const midiNote = labelToMidiNote(note);
      if (midiNote != null) {
        const noteConfiguration = this.props.noteConfiguration[midiNote];
        const audioBuffer = this.props.audioBuffers[midiNote];

        if (noteConfiguration && audioBuffer) {
          overlay = (
            <AdjustClipOverlay
              onClose={this.props.location.pathname}
              videoClipSources={noteConfiguration.sources}
              audioBuffer={audioBuffer}
              playbackParams={noteConfiguration.playbackParams}
              onFinish={this.onFinishAdjust.bind(this, midiNote)}
              note={midiNote}
            />
          );
        }
      }
    }

    if (
      (match = this.props.location.hash.match(
        /^#choose-video-clip\?note=([\w]+)/
      ))
    ) {
      const note = match[1];
      overlay = (
        <ChooseVideoClipOverlay
          onClose={this.props.location.pathname}
          database={this.context.firebase.database()}
          songBoardId={this.props.songBoardId}
          currentUser={this.props.currentUser}
          note={labelToMidiNote(note)}
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
      intersection(
        Object.keys(this.props.noteConfiguration).map(parseInt),
        notes
      ).length;

    let subHeaderEl;
    let notificationPopupEl;

    if (this.props.collaborateMode) {
      subHeaderEl = (
        <SubHeader>
          <span className="mobile-text">
            <Message msgKey="mobile-playback-instructions" />
          </span>
          <span className="desktop-text">
            <Message msgKey="desktop-playback-instructions" />
          </span>
        </SubHeader>
      );
    } else {
      subHeaderEl = (
        <SubHeader>
          <span>
            <Message msgKey="sub-header-tip-for-op" EMPTY_COUNT={emptyCount} />
          </span>
        </SubHeader>
      );
    }

    return (
      <div className="page-vertical-wrapper record-videos-page">
        <PageHeader>
          <HeaderLeft>
            <PageHeaderAction href="/">
              <Message msgKey="cancel-action" />
            </PageHeaderAction>
          </HeaderLeft>

          <HeaderMiddle>

            <SongTitleAndAuthor
              songTitle={this.props.songTitle}
              onChangeTitle={this.onChangeTitle}
            />

          </HeaderMiddle>

          <HeaderRight>
            <PageHeaderAction
              href={noteEditorPath(this.props.songBoardId)}
              primary
            >
              <Message msgKey="next-action" />
            </PageHeaderAction>
          </HeaderRight>
        </PageHeader>
        <div className="page-content">
          {this.props.supported
            ? <div>
                {subHeaderEl}
                <VideoGrid
                  readonly
                  noteConfiguration={this.props.noteConfiguration}
                  playCommands$={this.props.playCommands$}
                  readonly={false}
                  loading={this.props.loading}
                  onStartRecording={this.props.onStartRecording}
                  onStopRecording={this.props.onStopRecording}
                  onClear={this.props.onClearVideoClip}
                  onAdjust={this.onAdjust}
                  mediaStream={this.props.mediaStream}
                  countdownUntilRecord={this.props.countdownUntilRecord}
                  durationRecorded={this.props.durationRecorded}
                  noteBeingRecorded={this.props.noteBeingRecorded}
                  pitchCorrection={this.props.pitchCorrection}
                  ref={this.bindVideoGrid}
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
  messages: PropTypes.object.isRequired,
  firebase: PropTypes.object.isRequired
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
  props: { photoURL: string, authorName: string }
) {
  return (
    <NotificationPopup photoURL={props.photoURL}>
      <p>
        {props.authorName}
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
