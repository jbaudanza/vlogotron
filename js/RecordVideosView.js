import React from 'react';

import {Subject} from 'rxjs/Subject';

import {bindAll, bindKey} from 'lodash';

import Page from './Page';
import VideoGrid from './VideoGrid';
import RecordVideosHeader from './RecordVideosHeader';

function noop() {console.log('noop')}

export default class RecordVideosView extends React.Component {
  constructor() {
    super();
    bindAll(this, 'bindVideoGrid', 'onClickLogin');

    this.actions = {
      startRecording$: new Subject(),
      stopRecording$: new Subject()
    };

    this.onStartRecording = bindKey(this.actions.startRecording$, 'next');
    this.onStopRecording = bindKey(this.actions.stopRecording$, 'next');
  }

  componentWillUnmount() {
    this.actions.startRecording$.complete();
    this.actions.stopRecording$.complete();
  }

  bindVideoGrid(component) {
    if (component) {
      this.actions.playCommands$$ = component.playCommands$$;
    }
  }

  onClickLogin() {
    this.props.onNavigate('#login')
  }

  render() {
    const header = <RecordVideosHeader songTitle={this.props.songTitle} />;

    return (
      <Page
        onLogin={this.onClickLogin}
        onLogout={() => true}
        isLoggedIn={false}
        sidebarVisible={false}
        header={header}
        className='record-videos-page'
        footerText={this.context.messages['record-videos-tip-long']()}
        >
        <VideoGrid readonly
          loading={this.props.loading}
          videoClips={this.props.videoClips}
          playCommands$={this.props.playCommands$}
          readonly={false}
          onStartRecording={this.onStartRecording}
          onStopRecording={this.onStopRecording}
          onClear={noop}
          mediaStream={this.props.mediaStream}
          countdownUntilRecord={this.props.countdownUntilRecord}
          durationRecorded={this.props.durationRecorded}
          noteBeingRecorded={this.props.noteBeingRecorded}
          ref={this.bindVideoGrid}
          />
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
  isPlaying:     React.PropTypes.bool.isRequired,
  songLength:    React.PropTypes.number.isRequired,
  songTitle:     React.PropTypes.string.isRequired
}
