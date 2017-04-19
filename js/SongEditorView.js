import React from "react";

import Page from "./Page";
import Link from "./Link";
import RecordVideosHeader from "./RecordVideosHeader";
import VideoGrid from "./VideoGrid";
import LoginOverlay from "./LoginOverlay";
import PianoRoll from "./PianoRoll";
import PianoRollHeader from "./PianoRollHeader";
import ChooseSongOverlay from "./ChooseSongOverlay";

import { bindAll, bindKey } from "lodash";

import "./SongEditorView.scss";

export default class SongEditorView extends React.Component {
  constructor() {
    super();
    bindAll(this, "bindPianoRoll");
  }

  componentWillMount() {
    this.onClickPlay = bindKey(this.props.actions.play$, "next");
    this.onClickPause = bindKey(this.props.actions.pause$, "next");
    this.onChangePlaybackStartPosition = bindKey(
      this.props.actions.changePlaybackStartPosition$,
      "next"
    );
    this.onChangeCellsPerBeat = bindKey(
      this.props.actions.changeCellsPerBeat$,
      "next"
    );
    this.onChooseSong = this.onChooseSong.bind(this);
  }

  bindPianoRoll(component) {
    if (component) {
      this.subscription = component.edits$.subscribe(
        this.props.actions.editSong$
      );
    } else {
      if (this.subscription) {
        this.subscription.unsubscribe();
        delete this.subscription;
      }
    }
  }

  onChooseSong(song) {
    this.props.actions.chooseSong$.next(song);
    this.props.onNavigate('/song-editor')
  }

  render() {
    const header = (
      <RecordVideosHeader
        songTitle={this.props.songTitle}
        secondaryAction={{ href: "/record-videos" }}
        secondaryActionLabel={this.context.messages["back-action"]()}
        primaryAction={{ href: "#" }}
        primaryActionLabel={this.context.messages["save-action"]()}
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
          onClose="/song-editor"
        />
      );
    }

    const footer = (
      <div className="page-footer">
        <div className="page-footer-content page-footer-with-piano-roll">
          <PianoRollHeader
            onClickPlay={this.onClickPlay}
            onClickPause={this.onClickPause}
            isPlaying={this.props.isPlaying}
            isRecording={false}
            cellsPerBeat={this.props.cellsPerBeat}
            onChangeCellsPerBeat={this.onChangeCellsPerBeat}
          />
          <PianoRoll
            ref={this.bindPianoRoll}
            notes={this.props.notes}
            cellsPerBeat={this.props.cellsPerBeat}
            songLength={this.props.songLength}
            playbackPosition$$={this.props.playbackPositionInBeats$$}
            playing={{}}
            playbackStartPosition={this.props.playbackStartPosition}
            onChangePlaybackStartPosition={this.onChangePlaybackStartPosition}
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
        className="song-editor-page"
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

SongEditorView.contextTypes = {
  messages: React.PropTypes.object.isRequired
};
