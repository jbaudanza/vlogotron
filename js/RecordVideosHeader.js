import React from 'react';
import Link from './Link';


export default class RecordVideosHeader extends React.Component {
  render() {
    const props = this.props;
    return (
      <div className='page-header'>
        <div className='first'>
          <Link className='action' {...props.secondaryAction}>
            {props.secondaryActionLabel}
          </Link>
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
          <Link className='action primary' {...props.primaryAction}>
            {props.primaryActionLabel}
          </Link>
        </div>
      </div>
    );
  }
}
