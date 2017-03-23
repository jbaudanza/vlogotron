import React from 'react';
import ReactDOM from 'react-dom';

import {bindAll} from 'lodash';
import classNames from 'classnames';
import colors from './colors'
import Link from './Link';
import NoteLabel from './NoteLabel';

import {findWrappingLink} from './domutils';

import './VideoCell.scss';

export default class VideoCell extends React.Component {
  constructor() {
    super();
    bindAll(this, 'setVideoStream', 'onClear');
  }

  setVideoStream(videoEl) {
    if (this.props.stream) {
      videoEl.srcObject = this.props.stream;
      videoEl.play();
    }
  }

  onClear() {
    if (window.confirm('Do you want to remove this clip?')) {
      this.props.onClear();
    }
  }

  render() {
    let videoEl;
    let countdownEl;
    let stopActionEl;
    let shadeEl;
    let clearEl;

    if (this.props.countdown) {
      countdownEl = (
        <div className='countdown-label'>
          <div className='text'>Sing along with the tone. Recording in</div>
          <div className='number'>{this.props.countdown}</div>
        </div>
      );
    }

    if (this.props.stream) {
      videoEl = <video key="recorder" muted ref={this.setVideoStream} />;

      if (!this.props.countdown) {
        stopActionEl = (
          <Link onClick={this.props.onStopRecording} className='stop-action'>
            Click to stop recording
            <svg version="1.1" width="10px" height="10px" className='record-status'>
              <circle cx="5" cy="5" r="5" fill={colors.red}>
                <animate
                        attributeType="XML"
                        attributeName="opacity"
                        calcMode="discrete"
                        dur="0.75s"
                        values="0;1"
                        keyTimes="0;0.5"
                        repeatCount="indefinite" />
              </circle>
            </svg>
          </Link>
        );
      }
    } else if (this.props.videoClip) {
      videoEl = (
        <video
          id={'playback-' + this.props.note}
          key={"playback-" + this.props.videoClip.clipId}
          playsInline
          muted
          poster={this.props.videoClip.poster}>
          {
            this.props.videoClip.sources.map((props) => (
              <source {...props} key={props.type} />)
            )
          }
        </video>
      );

      shadeEl = (<div className='shade' />);

      if (!this.props.playing) {
        if (!this.props.readonly) {
          clearEl = (
            <Link onClick={this.onClear} className='clear-button'>
              <svg version="1.1" width="25px" height="25px">
                <use xlinkHref="#close" fill="white"/>
              </svg>
            </Link>
          );
        }
      }
    } else {
      const fill = this.props.playing ? colors.active: '#eee';

      let recordPromptEl;

      if (!this.props.readonly) {
        recordPromptEl = (
          <div className='record-prompt'>
            <svg version="1.1" width="20px" height="20px">
              <circle cx="10" cy="10" r="10" fill={colors.red} />
            </svg>
            <div>
              Record a clip
            </div>
          </div>
        );
      }

      videoEl = (
        <Link
            className='empty-video'r
            onClick={this.props.onStartRecording}
            enabled={!this.props.recording && !this.props.readonly}>
          <svg version="1.1" className='background'>
            <use xlinkHref='#video-record' fill={fill} />
          </svg>
          {recordPromptEl}
        </Link>
      );
    }

    return (
      <div
        className={
          classNames('video-cell touchable', {
            playing: this.props.playing,
            sharp: this.props.note.includes('#')
          })
        }
        data-note={this.props.note}
        >
        {videoEl}
        {countdownEl}
        {stopActionEl}
        {shadeEl}
        <NoteLabel note={this.props.note} />
        {clearEl}
      </div>
    );
  }
}

VideoCell.propTypes = {
  note:              React.PropTypes.string.isRequired,
  onStartRecording:  React.PropTypes.func.isRequired,
  onStopRecording:   React.PropTypes.func.isRequired,
  recording:         React.PropTypes.bool.isRequired,
  playing:           React.PropTypes.bool.isRequired,
  videoClip:         React.PropTypes.object,
  readonly:          React.PropTypes.bool,
  countdown:         React.PropTypes.number
};
