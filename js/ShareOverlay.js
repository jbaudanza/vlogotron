import React from "react";

import Overlay from "./Overlay";
import Link from "./Link";
import {
  ShareButtons,
  ShareCounts,
  generateShareIcon,
} from "react-share";

const providers = ["Facebook", "Google", "Twitter"];

const {
  FacebookShareButton,
  GooglePlusShareButton,
  TwitterShareButton,
} = ShareButtons;

const FacebookIcon = generateShareIcon("facebook");
const TwitterIcon = generateShareIcon("twitter");
const GooglePlusIcon = generateShareIcon("google");

//TODO: use song title
//TODO: correct song link
const title = "Vlogotron";

function onInputClick(event) {
  const el = event.target;
  el.selectionStart = 0;
  el.selectionEnd = el.value.length;
}

export default class ShareOverlay extends React.Component {
  render() {
    return (
      <Overlay className="login-overlay" onClose={this.props.onClose}>
        <h1>Share</h1>
          <form>
            <input type="text" value={this.props.url} size={50} readOnly onClick={onInputClick}/>
          </form>
          <div className="Share__container">
            <div className="Share__some-network">
              <FacebookShareButton
                url={this.props.url}
                title={title}
                className="Share__some-network__share-button">
                <FacebookIcon
                  size={32}
                  round />
              </FacebookShareButton>
            </div>

            <div className="Share__some-network">
              <TwitterShareButton
                url={this.props.url}
                title={title}
                className="Share__some-network__share-button">
                <TwitterIcon
                  size={32}
                  round />
              </TwitterShareButton>
            </div>
            <div className="Share__some-network">
              <GooglePlusShareButton
                url={this.props.url}
                className="Share__some-network__share-button">
                <GooglePlusIcon
                  size={32}
                  round />
              </GooglePlusShareButton>
            </div>
          </div>
      </Overlay>
    );
  }
}

ShareOverlay.propTypes = {
  onLogin: React.PropTypes.func.isRequired,
  onClose: React.PropTypes.string.isRequired
};
