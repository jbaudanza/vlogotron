import React from 'react';

import {bindAll} from 'lodash';

import Page from './Page';
import VideoGrid from './VideoGrid';


export default class PlaybackView extends React.Component {
  constructor() {
    super();
    bindAll(this, 'bindVideoGrid', 'bindPage');
    this.actions = {};
  }

  bindVideoGrid(component) {
    this.actions.playCommands$$ = component.playCommands$$;
  }

  bindPage(component) {
    this.actions.play$ = component.play$;
  }

  render() {
    return (
      <Page ref={this.bindPage} isPlaying={this.props.isPlaying}>
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
  playCommands$: React.PropTypes.object.isRequired,
  isPlaying:     React.PropTypes.bool.isRequired
}
