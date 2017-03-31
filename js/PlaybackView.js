import React from 'react';

import {bindAll} from 'lodash';

import {Subject} from 'rxjs/Subject';

import Page from './Page';
import PlaybackHeader from './PlaybackHeader';
import VideoGrid from './VideoGrid';

export default class PlaybackView extends React.Component {
  constructor() {
    super();
    bindAll(this, 'bindVideoGrid', 'onClickLogin');
    this.actions = {
      play$: new Subject(),
      pause$: new Subject()
    };

    this.onClickPlay = this.actions.play$.next.bind(this.actions.play$);
    this.onClickPause = this.actions.pause$.next.bind(this.actions.pause$);
  }

  bindVideoGrid(component) {
    if (component) {
      this.actions.playCommands$$ = component.playCommands$$;
    }
  }

  componentWillUnmount() {
    this.actions.play$.complete();
    this.actions.pause$.complete();
  }

  onClickLogin() {
    this.props.onNavigate('#login')
  }

  render() {
    const header = (
      <PlaybackHeader
          className='playback-page'
          isPlaying={this.props.isPlaying}
          songTitle={this.props.songTitle}
          songLength={this.props.songLength}
          authorName={this.props.authorName}
          playbackPositionInSeconds={this.props.playbackPositionInSeconds}
          onClickPlay={this.onClickPlay}
          onClickPause={this.onClickPause} />
    );

    return (
      <Page
        onLogin={this.onClickLogin}
        onLogout={() => true}
        isLoggedIn={false}
        header={header}
        sidebarVisible={true}
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

PlaybackView.propTypes = {
  loading:       React.PropTypes.bool.isRequired,
  videoClips:    React.PropTypes.object.isRequired,
  playCommands$: React.PropTypes.object.isRequired,
  isPlaying:     React.PropTypes.bool.isRequired,
  songLength:    React.PropTypes.number.isRequired,
  songTitle:     React.PropTypes.string.isRequired,
}
