import React from 'react';

import {bindAll} from 'lodash';

import Page from './Page';
import VideoGrid from './VideoGrid';

function noop() {}

export default class RecordVideosView extends React.Component {
  constructor() {
    super();
    bindAll(this, 'bindVideoGrid', 'bindPage', 'onClickLogin');
    this.actions = {};
  }

  bindVideoGrid(component) {
    if (component) {
      this.actions.playCommands$$ = component.playCommands$$;
    }
  }

  bindPage(component) {
    if (component) {
      this.actions.play$ = component.play$;
      this.actions.pause$ = component.pause$;
    }
  }

  onClickLogin() {
    this.props.onNavigate('#login')
  }

  render() {
    return (
      <Page
        ref={this.bindPage}
        isPlaying={this.props.isPlaying}
        songName={this.props.songName}
        songLength={this.props.songLength}
        playbackPositionInSeconds={this.props.playbackPositionInSeconds}
        onLogin={this.onClickLogin}
        onLogout={() => true}
        isLoggedIn={false}
        sidebarVisible={false}
        footerText={this.context.messages['record-videos-tip-long']()}
        >
        <VideoGrid readonly
          loading={this.props.loading}
          videoClips={this.props.videoClips}
          playCommands$={this.props.playCommands$}
          readonly={false}
          onStartRecording={noop}
          onStopRecording={noop}
          onClear={noop}
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
  songName:      React.PropTypes.string.isRequired,
}
