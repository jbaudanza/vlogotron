import React from 'react';

import Link from './Link';

import './Page.scss';


function NavLink(props) {
  return (
    <Link onClick={props.onClick} className='nav-link'>
      <svg version="1.1" width={props.width} height={props.height}>
        <use xlinkHref={props.icon} />
      </svg>
      <span>{props.text}</span>
    </Link>
  );
}

function noop() {}

export default class Page extends React.Component {
  render() {
    return (
      <div {...this.props} className='page'>
        <div className='page-sidebar'>
          <div className='logo'>VLOGOTRON</div>
          <div className='navigation'>
            <NavLink onClick={noop} width='33px' height='32px' icon='#svg-home' text="Home" />
            <NavLink onClick={noop} width='32px' height='29px' icon='#svg-sound-wave' text="My Tracks"/>
            <NavLink onClick={noop} width='30px' height='30px' icon='#svg-plus' text="Create New" />
            <NavLink onClick={noop} width='29px' height='27px' icon='#svg-logout' text="Logout" />
          </div>
        </div>

        <div className="page-vertical-wrapper">
          <div className='page-header'>

            <Link onClick={noop} className='play-button'>
              <svg version="1.1" width={32} height={32}>
                <use xlinkHref='#svg-play' />
              </svg>
            </Link>

            <div className='song-info'>
              <div className='top'>
                <span className='song-title'>Happy birthday to you</span>
                <span className='by'> by </span>
                <span className='song-author'>Jack Harris</span>
              </div>
              <div className='bottom'>
                0:00 | 3:41
              </div>
            </div>

            <div className='actions'>
              <Link onClick={noop}>Share</Link>
              <Link onClick={noop}>Remix</Link>
            </div>
          </div>
          <div className='page-content'>
            {this.props.children}
          </div>
          <div className='page-footer'>
            Click on a square to start recording. You will here a sample of the
            selected note playing, please repeat it after the countdown.
          </div>
        </div>
      </div>
    );
  }
}
