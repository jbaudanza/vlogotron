import React from "react";

import { bindAll, bindKey, forEach } from "lodash";

import Page from "./Page";
import VideoGrid from "./VideoGrid";
import RecordVideosHeader from "./RecordVideosHeader";
import PageTextFooter from "./PageTextFooter";
import LoginOverlay from "./LoginOverlay";

export default class RecordVideosView extends React.Component {
  constructor() {
    super();
    bindAll(this, "bindVideoGrid", "onClickLogin");
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

  onClickLogin() {
    this.props.onNavigate("#login");
  }

  render() {
    const callbacks = this.props.actions.callbacks;

    const header = (
      <RecordVideosHeader
        songTitle={this.props.songTitle}
        secondaryAction={{ href: "/" }}
        secondaryActionLabel={this.context.messages["cancel-action"]()}
        primaryAction={{ href: "/song-editor" }}
        primaryActionLabel={this.context.messages["next-action"]()}
      />
    );

    let footer;
    if (this.props.error) {
      footer = (
        <PageTextFooter
          error
          text={this.props.error}
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
        isLoggedIn={!!this.props.currentUser}
        sidebarVisible={false}
        header={header}
        footer={footer}
        className="record-videos-page"
      >
        <VideoGrid
          readonly
          loading={this.props.loading}
          videoClips={this.props.videoClips}
          playCommands$={this.props.playCommands$}
          readonly={false}
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
  loading: React.PropTypes.bool.isRequired,
  videoClips: React.PropTypes.object.isRequired,
  playCommands$: React.PropTypes.object.isRequired,
  songTitle: React.PropTypes.string.isRequired
};
