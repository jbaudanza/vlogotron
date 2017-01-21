import React from 'react';
import ReactDOM from 'react-dom';

import {bindAll} from 'lodash';
import classNames from 'classnames';
import colors from './colors'
import Link from './Link';

import {fromEvent} from 'rxjs/observable/fromEvent';


// Find the wrapping anchor tag, if any
function findWrappingLink(startEl, stopEl) {
  let iterEl = startEl;

  while (iterEl && iterEl !== stopEl) {
    if (iterEl instanceof HTMLAnchorElement)
      return iterEl;
    else
      iterEl = iterEl.parentNode;
  }

  return null;
}


export default class VideoCell extends React.Component {
  constructor() {
    super();
    bindAll(this, 'setVideoStream', 'onClear', 'onMouseDown');
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

  onMouseDown(event) {
    // Ignore mouse clicks on links
    if (findWrappingLink(event.target, ReactDOM.findDOMNode(this)))
      return;

    this.props.onStartPlayback();

    fromEvent(document, 'mouseup')
      .take(1)
      .subscribe(() => this.props.onStopPlayback());
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
    } else if (this.props.src) {
      videoEl = (
        <video id={'playback-' + this.props.note} key="playback" src={this.props.src} />
      );
      if (!this.props.playing) {
        shadeEl = <div className='shade' />;
        clearEl = (
          <Link onClick={this.onClear} className='clear-button'>
            <svg version="1.1" width="25px" height="25px">
              <use xlinkHref="#close" fill="white"/>
            </svg>
          </Link>
        );
      }
    } else {
      const fill = this.props.playing ? colors.active: '#eee';

      videoEl = (
        <Link className='empty-video' onClick={this.props.onStartRecording} enabled={!this.props.recording}>
          <svg version="1.1" width="75px" height="75px" className='background'>
            <use xlinkHref='#video-record' fill={fill} />
          </svg>
          <div className='record-prompt'>
            <svg version="1.1" width="20px" height="20px">
              <circle cx="10" cy="10" r="10" fill={colors.red} />
            </svg>
            <div>
              Record a clip
            </div>
          </div>
        </Link>
      );
    }

    return (
      <div onMouseDown={this.onMouseDown}
        className={classNames('video-cell', {playing: this.props.playing})}>
        {videoEl}
        {countdownEl}
        {stopActionEl}
        {shadeEl}
        <div className='note-label'>
          {this.props.note}
        </div>
        {clearEl}
      </div>
    );
  }
}

VideoCell.propTypes = {
  onStartRecording:  React.PropTypes.func.isRequired,
  onStopRecording:   React.PropTypes.func.isRequired,
  onStartPlayback:   React.PropTypes.func.isRequired,
  onStopPlayback:    React.PropTypes.func.isRequired,
  recording:         React.PropTypes.bool.isRequired,
  playing:           React.PropTypes.bool.isRequired,
  countdown:         React.PropTypes.number
};
