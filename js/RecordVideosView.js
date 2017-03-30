import React from 'react';

import {bindAll} from 'lodash';

import Page from './Page';
import VideoGrid from './VideoGrid';

const messages = require('messageformat-loader!json-loader!./messages.json');

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
        footerText={messages['record-videos-tip']()}
        >
        <VideoGrid readonly
          loading={this.props.loading}
          videoClips={this.props.videoClips}
          playCommands$={this.props.playCommands$}
          ref={this.bindVideoGrid}
          />
      </Page>
    );
  }
}

RecordVideosView.propTypes = {
  loading:       React.PropTypes.bool.isRequired,
  videoClips:    React.PropTypes.object.isRequired,
  playCommands$: React.PropTypes.object.isRequired,
  isPlaying:     React.PropTypes.bool.isRequired,
  songLength:    React.PropTypes.number.isRequired,
  songName:      React.PropTypes.string.isRequired,
}
