import React from 'react';

import Link from './Link';


function onInputClick(event) {
  const el = event.target;
  el.selectionStart = 0;
  el.selectionEnd = el.value.length;
}

const facebookBase = "https://www.facebook.com/dialog/share?&app_id=177263209421488&display=popup&href=";
const twitterBase = "https://twitter.com/share?url=";

function openPopup(baseUrl, text) {
  window.open(
    baseUrl + encodeURIComponent(text),
    "_blank",
    'width=620,height=400'
  );
}

export default class SocialSection extends React.Component {
  render() {
    return (
      <form className='share-buttons'>
        <input
            id="url-input"
            type="text"
            size="50"
            value={this.props.url}
            readOnly
            onClick={onInputClick} />
        <Link onClick={openPopup.bind(null, twitterBase, this.props.url)}>
          <svg version="1.1" width="35px" height="35px">
            <use xlinkHref='#twitter' />
          </svg>
        </Link>
        <Link onClick={openPopup.bind(null, facebookBase, this.props.url)}>
          <svg version="1.1" width="35px" height="35px">
            <use xlinkHref='#facebook' />
          </svg>
        </Link>
      </form>
    )
  }
}

SocialSection.propTypes = {
  url: React.PropTypes.string.isRequired
};
