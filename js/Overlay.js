import React from 'react';
import Link from './Link';

import './overlay.scss'


class Overlay extends React.Component {

  componentDidMount() {
    this._keyDownHandler = this.onKeyDown.bind(this);
    document.addEventListener('keydown', this._keyDownHandler);
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this._keyDownHandler);
  }

  onKeyDown(event) {
    if (event instanceof KeyboardEvent && event.keyCode === 27) { // escape
      event.preventDefault();
      this.props.onClose();
    }
  }

  render() {
    const className = ((this.props.className || '') + " overlay").trim();

    return (
      <div id="overlay" className={className}>
        <div className='shadow'/>
        <div className='content'>
          <Link onClick={this.props.onClose} className="close-link">
            <svg version="1.1">
              <use xlinkHref="#close" fill="white"/>
            </svg>
          </Link>
          <div className='scroll'>
            {this.props.children}
          </div>
        </div>
      </div>
    );
  }
}

Overlay.propTypes = {
  onClose:   React.PropTypes.func.isRequired,
  className: React.PropTypes.string
};

export default Overlay;
