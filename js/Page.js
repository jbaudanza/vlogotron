import React from 'react';

import classNames from 'classnames';
import {omit} from 'lodash';


import Link from './Link';

import './Page.scss';


function NavLink(props) {
  const linkProps = omit(props, 'icon', 'text');
  return (
    <Link {...linkProps} className='nav-link'>
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
      <div className={classNames('page', this.props.className)}>
        <div className={classNames('page-sidebar', {hidden: !this.props.sidebarVisible})}>
          <div className='page-sidebar-content'>
            <div className='logo'>VLOGOTRON</div>
            <div className='navigation'>
              <NavLink href="/" width='33px' height='32px' icon='#svg-home' text="Home" />
              {
                (this.props.isLoggedIn) ? (
                  <NavLink onClick={noop} width='32px' height='29px' icon='#svg-sound-wave' text="My Tracks"/>
                ) : (
                  null
                )
              }
              <NavLink href="/record-videos" width='30px' height='30px' icon='#svg-plus' text="Create New" />
              {
                (this.props.isLoggedIn) ? (
                  <NavLink onClick={this.props.onLogout} width='29px' height='27px' icon='#svg-logout' text="Logout" />
                ) : (
                  <NavLink href="#login" width='33px' height='33px' icon='#svg-login' text="Login" />
                )
              }
            </div>
          </div>
        </div>

        <div className="page-vertical-wrapper">
          {this.props.header}
          <div className='page-content'>
            {this.props.children}
          </div>
          {this.props.footer}
        </div>
      </div>
    );
  }
}

Page.PropTypes = {
  sidebarVisible: React.PropTypes.bool.isRequired,
  header:         React.PropTypes.node.isRequired,
  footer:         React.PropTypes.node,
}
