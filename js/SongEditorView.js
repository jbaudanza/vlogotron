import React from 'react';

import Page from './Page';
import RecordVideosHeader from './RecordVideosHeader';
import VideoGrid from './VideoGrid';
import LoginOverlay from './LoginOverlay';
import PianoRoll from './PianoRoll';



export default class SongEditorView extends React.Component {
  render() {
    const header = (
      <RecordVideosHeader
        songTitle={this.props.songTitle}
        secondaryAction={{href: '/record-videos'}}
        secondaryActionLabel={this.context.messages['back-action']()}
        primaryAction={{href: '#'}}
        primaryActionLabel={this.context.messages['save-action']()} />
    );

    // TODO: Factor this out from RecordVideosView
    let overlay;
    if (!this.props.currentUser) {
      overlay = (
        <LoginOverlay onLogin={this.props.onLogin} onClose='/' />
      );
    }

    const footer = (
      <div className='page-footer'>
        <div className='page-footer-content'>
          <PianoRoll
            notes={[]}
            cellsPerBeat={4}
            playing={false}
            onChangePlaybackStartPosition={function() {}} />
        </div>
      </div>
    )

    return (
      <Page
        onLogin={this.onClickLogin}
        onLogout={this.props.onLogout}
        isLoggedIn={!!this.props.currentUser}
        sidebarVisible={false}
        header={header}
        footer={footer}
        className='record-videos-page'
        >
        <VideoGrid readonly
          loading={this.props.loading}
          videoClips={this.props.videoClips}
          playCommands$={this.props.playCommands$}
          readonly={true}
          onClear={this.onClearVideoClip}
          mediaStream={this.props.mediaStream}
          ref={this.bindVideoGrid} />
        {overlay}
      </Page>
    );
  }
};

SongEditorView.contextTypes = {
  messages: React.PropTypes.object.isRequired
};
