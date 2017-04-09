import React from 'react';

import {bindAll, bindKey, forEach} from 'lodash';

import Page from './Page';
import VideoGrid from './VideoGrid';
import RecordVideosHeader from './RecordVideosHeader';
import LoginOverlay from './LoginOverlay';


export default class RecordVideosView extends React.Component {
  constructor() {
    super();
    bindAll(this, 'bindVideoGrid', 'onClickLogin');
  }

  componentWillMount() {
    this.onStartRecording = bindKey(this.props.actions.startRecording$, 'next');
    this.onStopRecording = bindKey(this.props.actions.stopRecording$, 'next');
    this.onDismissError = bindKey(this.props.actions.dismissError$, 'next');
    this.onClearVideoClip = bindKey(this.props.actions.clearVideoClip$, 'next');
  }

  bindVideoGrid(component) {
    if (component) {
      this.subscription = component.playCommands$$.subscribe(this.props.actions.playCommands$$);
    } else {
      if (this.subscription)
        this.subscription.unsubscribe();
    }
  }

  onClickLogin() {
    this.props.onNavigate('#login')
  }

  render() {
    const header = (
      <RecordVideosHeader
        songTitle={this.props.songTitle}
        secondaryAction={{href: '/'}}
        secondaryActionLabel={this.context.messages['cancel-action']()}
        primaryAction={{href: '/song-editor'}}
        primaryActionLabel={this.context.messages['next-action']()} />
    );

    let overlay;
    if (!this.props.currentUser) {
      overlay = (
        <LoginOverlay onLogin={this.props.onLogin} onClose='/' />
      );
    }

    return (
      <Page
        onLogin={this.onClickLogin}
        onLogout={this.props.onLogout}
        isLoggedIn={!!this.props.currentUser}
        onDismissError={this.onDismissError}
        sidebarVisible={false}
        header={header}
        className='record-videos-page'
        footerText={this.context.messages['record-videos-tip-long']()}
        error={this.props.error}
        >
        <VideoGrid readonly
          loading={this.props.loading}
          videoClips={this.props.videoClips}
          playCommands$={this.props.playCommands$}
          readonly={false}
          onStartRecording={this.onStartRecording}
          onStopRecording={this.onStopRecording}
          onClear={this.onClearVideoClip}
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
  loading:       React.PropTypes.bool.isRequired,
  videoClips:    React.PropTypes.object.isRequired,
  playCommands$: React.PropTypes.object.isRequired,
  songTitle:     React.PropTypes.string.isRequired
};
