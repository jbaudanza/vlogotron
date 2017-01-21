import React from 'react';

import {bindAll} from 'lodash';
import classNames from 'classnames';

import Link from './Link';


// TODO: sync this with css somehow?
const redColor = '#bc1838';

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
          <Link onClick={this.props.onStop} className='stop-action'>
            Click to stop recording
            <svg version="1.1" width="10px" height="10px" className='record-status'>
              <circle cx="5" cy="5" r="5" fill={redColor}>
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
    } else if (this.props.src) {
      videoEl = (
        <Link onClick={this.onClear}>
          <video id={'playback-' + this.props.note} key="playback" src={this.props.src} />
        </Link>
      );
    } else {
      const fill = this.props.playing ? activeColor: '#eee';

      videoEl = (
        <Link className='empty-video' onClick={this.props.onRecord} enabled={!this.props.recording}>
          <svg version="1.1" width="75px" height="75px" className='background'>
            <use xlinkHref='#video-record' fill={fill} />
          </svg>
          <div className='record-prompt'>
            <svg version="1.1" width="20px" height="20px">
              <circle cx="10" cy="10" r="10" fill={redColor} />
            </svg>
            <div>
              Record a clip
            </div>
          </div>
        </Link>
      );
    }

    return (
      <div className={classNames('video-cell', {playing: this.props.playing})}>
        <div className='note-label'>
          {this.props.note}
        </div>
        {videoEl}
        {countdownEl}
        {stopActionEl}
      </div>
    );
  }
}

VideoCell.propTypes = {
  onRecord:   React.PropTypes.func.isRequired,
  onStop:     React.PropTypes.func.isRequired,
  recording:  React.PropTypes.bool.isRequired,
  playing:    React.PropTypes.bool.isRequired,
  countdown:  React.PropTypes.number
};
