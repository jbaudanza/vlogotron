import React from 'react';
import Link from './Link';

function noop() {}

export default class RecordVideosHeader extends React.Component {
  render() {
    const props = this.props;
    return (
      <div className='page-header'>
        <Link className='action' href="/">{this.context.messages['cancel-action']()}</Link>
        <div className='song-title'>
          {this.props.songTitle}
        </div>
        <svg version="1.1" width="13px" height="13px">
          <use xlinkHref="#svg-pencil" fill="white"/>
        </svg>
        <Link className='action inverse' onClick={noop}>{this.context.messages['next-action']()}</Link>
      </div>
    );
  }
}

RecordVideosHeader.contextTypes = {
  messages: React.PropTypes.object.isRequired
};
