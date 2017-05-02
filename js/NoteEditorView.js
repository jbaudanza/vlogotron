import React from "react";

import Page from "./Page";
import Link from "./Link";
import SongEditorHeader from "./SongEditorHeader";
import VideoGrid from "./VideoGrid";
import LoginOverlay from "./LoginOverlay";
import PianoRoll from "./PianoRoll";
import PianoRollHeader from "./PianoRollHeader";
import ChooseSongOverlay from "./ChooseSongOverlay";

import { bindAll, bindKey } from "lodash";

import "./NoteEditorView.scss";

function withObservables(component, events) {
  return;
}

export default class NoteEditorView extends React.Component {
  constructor() {
    super();
    bindAll(
      this,
      "bindPianoRoll",
      "onChangeBpm",
      "onChooseSong",
      "onRedo",
      "onReset",
      "onUndo"
    );
  }

  bindPianoRoll(component) {
    if (component) {
      this.subscription = component.edits$.subscribe(
        this.props.actions.subjects.editSong$
      );
    } else {
      if (this.subscription) {
        this.subscription.unsubscribe();
        delete this.subscription;
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

  onChangeBpm(bpm) {
    this.props.actions.subjects.editSong$.next({
      action: "change-bpm",
      bpm: bpm
    });
  }

  onChooseSong(song) {
    this.props.actions.subjects.editSong$.next({
      action: "replace-all",
      notes: song.notes
    });
    this.props.onNavigate("/song-editor");
  }

  render() {
    const header = (
      <SongEditorHeader
        songTitle={this.props.songTitle}
        secondaryAction={{ href: "/record-videos" }}
        secondaryActionLabel={this.context.messages["back-action"]()}
        primaryAction={{ href: "#" }}
        primaryActionLabel={this.context.messages["save-action"]()}
        onChangeTitle={this.props.actions.callbacks.onChangeTitle}
      />
    );

    // TODO: Factor this out from RecordVideosView
    let overlay;

    if (!this.props.currentUser) {
      overlay = <LoginOverlay onLogin={this.props.onLogin} onClose="/" />;
    }

    if (this.props.location.hash === "#choose-song") {
      overlay = (
        <ChooseSongOverlay
          onSelect={this.onChooseSong}
          media={this.props.media}
          onClose="/note-editor"
          bpm={this.props.bpm}
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
      <Page
        onLogin={this.onClickLogin}
        onLogout={this.props.onLogout}
        isLoggedIn={!!this.props.currentUser}
        sidebarVisible={false}
        header={header}
        footer={footer}
        className="note-editor-page"
      >
        <VideoGrid
          readonly
          loading={this.props.loading}
          videoClips={this.props.videoClips}
          playCommands$={this.props.playCommands$}
          readonly={true}
          onClear={this.onClearVideoClip}
          mediaStream={this.props.mediaStream}
          ref={this.bindVideoGrid}
        />
        {overlay}
      </Page>
    );
  }
}

NoteEditorView.contextTypes = {
  messages: React.PropTypes.object.isRequired
};
