import React from 'react';
import Link from './Link';

function noop() {}

export default class RecordVideosHeader extends React.Component {
  render() {
    const props = this.props;
    return (
      <div className='page-header'>
        <div className='first'>
          <Link className='action' href="/">{this.context.messages['cancel-action']()}</Link>
        </div>
        <div className='middle'>
          <span className='song-title'>
            {this.props.songTitle}
          </span>
          <svg version="1.1" width="13px" height="13px">
            <use xlinkHref="#svg-pencil" fill="white"/>
          </svg>
        </div>
        <div className='last'>
          <Link className='action inverse' onClick={noop}>{this.context.messages['next-action']()}</Link>
        </div>
      </div>
    );
  }
}

RecordVideosHeader.contextTypes = {
  messages: React.PropTypes.object.isRequired
};
