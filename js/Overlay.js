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
            <svg fill="white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 120" x="0px" y="0px"><rect x="17.63" y="45.48" width="58.46" height="5.04" transform="translate(-20.22 47.19) rotate(-45)"/><rect x="44.34" y="18.77" width="5.04" height="58.46" transform="translate(-20.22 47.19) rotate(-45)"/><path d="M46.86,92.28A44.28,44.28,0,0,1,15.55,16.69,44.28,44.28,0,0,1,78.17,79.31,44,44,0,0,1,46.86,92.28Zm0-83.51a39.23,39.23,0,0,0-27.74,67A39.23,39.23,0,0,0,74.6,20.26h0A39,39,0,0,0,46.86,8.77Z"/></svg>
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
