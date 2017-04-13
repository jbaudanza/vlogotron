import React from "react";
import Link from "./Link";

// TODO: This name is kind of misleading because this header is also used
// on the SongEditor page
export default class RecordVideosHeader extends React.Component {
  render() {
    const props = this.props;
    return (
      <div className="page-header record-videos-header">
        <div className="first">
          <Link className="action" {...props.secondaryAction}>
            {props.secondaryActionLabel}
          </Link>
        </div>
        <div className="middle">
          <span className="song-title">
            {this.props.songTitle}
          </span>
          <svg version="1.1" width="13px" height="13px">
            <use xlinkHref="#svg-pencil" fill="white" />
          </svg>
        </div>
        <div className="last">
          <Link className="action primary" {...props.primaryAction}>
            {props.primaryActionLabel}
          </Link>
        </div>
      </div>
    );
  }
}
