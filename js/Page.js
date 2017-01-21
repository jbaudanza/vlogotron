import React from 'react';

import SvgAssets from './SvgAssets';

export default class Page extends React.Component {
  render() {
    return (
      <div {...this.props}>
        <SvgAssets />
        <header className='page-header'>
          <div className='content'>
            <div className="logo">
              <svg version="1.1" width="20px" height="20px" fill="white">
                <use xlinkHref='#piano' />
              </svg>
              <span>
                Vlogotron
              </span>
            </div>
          </div>
        </header>

        {this.props.children}

        <div className='credits'>
          <span>Made with </span>
          <svg version="1.1" width="20px" height="20px" className='background'>
            <use xlinkHref='#golden-gate' fill="#aaa" />
          </svg>
          <span>in San Francisco by </span>
          <a href="https://www.github.com/jbaudanza">Jon Baudanza</a>
        </div>
      </div>
    );
  }
}
