/* @flow */

import PropTypes from "prop-types";
import * as React from "react";

import Link from "./Link";

import {
  PageHeader,
  PageHeaderAction,
  HeaderLeft,
  HeaderMiddle,
  HeaderRight,
  PlaybackControls,
  SongTitleAndAuthor
} from "./PageHeader";

import VideoGrid from "./VideoGrid";
import LoginOverlay from "./LoginOverlay";
import PianoRoll from "./PianoRoll";
import PianoRollHeader from "./PianoRollHeader";
import Message from "./Message";
import ChooseAndPurchaseSongFlow from "./ChooseAndPurchaseSongFlow";
import { recordVideosPath } from "./router";

import { bindAll } from "lodash";
import type { Observable } from "rxjs/Observable";
import type { Subscription } from "rxjs/Subscription";
import type { Media, NoteConfiguration } from "./mediaLoading";

// $FlowFixMe
import "./NoteEditorView.scss";

type Props = {
  onNavigate: string => void,
  loading: Object,
  location: Object,
  songTitle: string,
  saveEnabled: boolean,
  onLogin: Function,
  bpm: number,
  songBoardId: string,
  songLength: number,
  isPlaying: boolean,
  cellsPerBeat: number,
  undoEnabled: boolean,
  redoEnabled: boolean,
  premiumAccountStatus: boolean,
  notes: Array<Object>,
  currentUser: Firebase$User,
  playbackStartPosition: number,
  noteConfiguration: NoteConfiguration,
  media: Media,
  playCommands$: Observable<Object>,
  playbackPositionInBeats$$: Observable<Object>,
  actions: Object
};

export default class NoteEditorView extends React.Component<Props> {
  constructor() {
    super();
    bindAll(
      this,
      "bindPianoRoll",
      "bindVideoGrid",
      "onChangeBpm",
      "onChooseSong",
      "onChangeTitle",
      "onRedo",
      "onReset",
      "onUndo"
    );
  }

  pianoRollSubscription: Subscription;
  videoGridSubscription: Subscription;

  bindPianoRoll(component: ?PianoRoll) {
    if (component) {
      this.pianoRollSubscription = component.edits$.subscribe(
        this.props.actions.subjects.editSong$
      );
    } else {
      if (this.pianoRollSubscription) {
        this.pianoRollSubscription.unsubscribe();
        delete this.pianoRollSubscription;
      }
    }
  }

  bindVideoGrid(component: ?VideoGrid) {
    if (component) {
      this.videoGridSubscription = component.playCommands$$.subscribe(
        this.props.actions.subjects.playCommands$$
      );
    } else {
      if (this.videoGridSubscription) {
        this.videoGridSubscription.unsubscribe();
        delete this.videoGridSubscription;
      }
    }
  }

  onReset() {
    this.props.actions.subjects.editSong$.next({
      action: "clear-all"
    });
  }

  onRedo() {
    this.props.actions.subjects.editSong$.next({ action: "redo" });
  }

  onUndo() {
    this.props.actions.subjects.editSong$.next({ action: "undo" });
  }

  onChangeBpm(bpm: number) {
    this.props.actions.subjects.editSong$.next({
      action: "change-bpm",
      bpm: bpm
    });
  }

  onChangeTitle(title: string) {
    this.props.actions.subjects.editSong$.next({
      action: "change-title",
      title: title
    });
  }

  onChooseSong(songId: string) {
    this.props.actions.subjects.editSong$.next({
      action: "update-song",
      songId: songId
    });
    this.props.onNavigate(this.props.location.pathname);
  }

  render() {
    const prevPathname = this.props.location.pathname.replace(
      "/note-editor",
      "/record-videos"
    );

    const header = (
      <PageHeader>
        <HeaderLeft>
          <PageHeaderAction href={recordVideosPath(this.props.songBoardId)}>
            <Message msgKey="back-action" />
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
            primary
            enabled={this.props.saveEnabled}
            onClick={this.props.actions.callbacks.onSave}
          >
            <Message msgKey="save-action" />
          </PageHeaderAction>
        </HeaderRight>
      </PageHeader>
    );

    // TODO: Factor this out from RecordVideosView
    let overlay;

    if (!this.props.currentUser) {
      overlay = <LoginOverlay onLogin={this.props.onLogin} onClose="/" />;
    }

    if (this.props.location.hash === "#choose-song") {
      overlay = (
        <ChooseAndPurchaseSongFlow
          onSelectSong={this.onChooseSong}
          onClose={this.props.location.pathname}
          premiumAccountStatus={this.props.premiumAccountStatus}
          currentUser={this.props.currentUser}
        />
      );
    }

    const footer = (
      <div className="page-footer">
        <div className="page-footer-content page-footer-with-piano-roll">
          <PianoRollHeader
            bpm={this.props.bpm}
            onChangeBpm={this.onChangeBpm}
            onClickPlay={this.props.actions.callbacks.onPlay}
            onClickPause={this.props.actions.callbacks.onPause}
            isPlaying={this.props.isPlaying}
            isRecording={false}
            onReset={this.onReset}
            onUndo={this.onUndo}
            onRedo={this.onRedo}
            cellsPerBeat={this.props.cellsPerBeat}
            onChangeCellsPerBeat={
              this.props.actions.callbacks.onChangeCellsPerBeat
            }
            undoEnabled={this.props.undoEnabled}
            redoEnabled={this.props.redoEnabled}
          />
          <PianoRoll
            ref={this.bindPianoRoll}
            notes={this.props.notes}
            cellsPerBeat={this.props.cellsPerBeat}
            songLength={this.props.songLength}
            playbackPosition$$={this.props.playbackPositionInBeats$$}
            playing={{}}
            playbackStartPosition={this.props.playbackStartPosition}
            onChangePlaybackStartPosition={
              this.props.actions.callbacks.onChangePlaybackStartPosition
            }
          />
        </div>
      </div>
    );

    return (
      <div className="note-editor-page page-vertical-wrapper">
        {header}
        <div className="page-content">
          <VideoGrid
            readonly
            noteConfiguration={this.props.noteConfiguration}
            loading={this.props.loading}
            playCommands$={this.props.playCommands$}
            ref={this.bindVideoGrid}
          />

        </div>
        {footer}
        {overlay}
      </div>
    );
  }
}
