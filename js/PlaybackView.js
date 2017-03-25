import React from 'react';

import Page from './Page';
import VideoGrid from './VideoGrid';


export default class PlaybackView extends React.Component {
  constructor() {
    super();
    this.bindVideoGrid = this.bindVideoGrid.bind(this);
  }

  bindVideoGrid(component) {
    this.actions = {
      playCommands$$: component.playCommands$$
    };
  }

  render() {
    return (
      <Page>
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

PlaybackView.propTypes = {
  loading:       React.PropTypes.bool.isRequired,
  videoClips:    React.PropTypes.object.isRequired,
  playCommands$: React.PropTypes.object.isRequired
}
