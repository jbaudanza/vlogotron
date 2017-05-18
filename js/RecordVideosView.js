import React from "react";

import { bindAll, bindKey, forEach } from "lodash";

import Page from "./Page";
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

    const header = (
      <SongEditorHeader
        songTitle={this.props.songTitle}
        onChangeTitle={this.onChangeTitle}
        secondaryAction={{ href: "/" }}
        secondaryActionLabel={this.context.messages["cancel-action"]()}
        primaryAction={{ href: nextPathname }}
        primaryActionLabel={this.context.messages["next-action"]()}
      />
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
    if (!this.props.currentUser) {
      overlay = <LoginOverlay onLogin={this.props.onLogin} onClose="/" />;
    }

    return (
      <Page
        onLogin={this.onClickLogin}
        onLogout={this.props.onLogout}
        onChangeLocale={this.props.onChangeLocale}
        isLoggedIn={!!this.props.currentUser}
        sidebarVisible={false}
        header={header}
        footer={footer}
        loading={false}
        className="record-videos-page"
      >
        <VideoGrid
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
          ref={this.bindVideoGrid}
        />
        {overlay}
      </Page>
    );
  }
}

RecordVideosView.contextTypes = {
  messages: React.PropTypes.object.isRequired
};

RecordVideosView.propTypes = {
  loading: React.PropTypes.object.isRequired,
  videoClips: React.PropTypes.object.isRequired,
  playCommands$: React.PropTypes.object.isRequired,
  songTitle: React.PropTypes.string.isRequired
};
