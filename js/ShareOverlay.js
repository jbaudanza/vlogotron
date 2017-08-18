/* @flow */
import * as React from "react";
import styled from "styled-components";

import Overlay from "./Overlay";
import colors from "./colors";

import TextWithCopyButton from "./TextWithCopyButton";

const Header = styled.div`
  font-size: 16px;
  font-weight: 500;
  color: ${colors.charcoalGrey};
  height: 31px;
  line-height: 31px;
  overflow: hidden;
  margin-top: 48px;
  margin-bottom: 14px;

  svg {
    float: left;
    margin-right: 13px;
  }
`;

type Props = {
  onClose: string,
  className: string,
  origin: string
};

class ShareOverlay extends React.Component<> {
  static defaultProps: Props;
  render() {
    return (
      <Overlay onClose={this.props.onClose} className={this.props.className}>
        <h1>Share and collaborate with friends</h1>

        <Header>
          {svgViewEl}
          Can only view your track
        </Header>

        <TextWithCopyButton value="http://example.com" />

        <Header>
          {editSvgEl}
          Can add new videos to your track
        </Header>

        <TextWithCopyButton value="http://example.com" />
      </Overlay>
    );
  }
}

export default styled(ShareOverlay)`
  .content {
    text-align: left;
    padding: 0 40px 40px 40px;
  }
`;

const editSvgEl = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    xmlnsXlink="http://www.w3.org/1999/xlink"
    width="31"
    height="31"
    viewBox="0 0 31 31"
  >
    <g fill="none" fillRule="evenodd" transform="translate(1 1)">
      <circle cx="14.5" cy="14.5" r="14.5" fill="#D9DFF6" stroke="#4B57A3" />
      <path
        fill="#9AA4E9"
        d="M21.594 9.315l-1.14 1.157.323.329a.42.42 0 0 1 0 .586l-7.959 8.083a.414.414 0 0 1-.094.069l-.01.007-2.98 1.534a.405.405 0 0 1-.473-.077L9.06 20.8l-.528.536a.403.403 0 0 1-.577 0 .42.42 0 0 1 0-.586l.528-.536-.202-.204a.42.42 0 0 1-.075-.48l1.51-3.027.008-.01a.402.402 0 0 1 .068-.095l3.817-3.877.002.003 4.242-4.285a.403.403 0 0 1 .475.076l.324.329 1.14-1.158a.404.404 0 0 1 .577 0l1.225 1.243a.42.42 0 0 1 0 .587"
      />
      <path
        fill="#29BDEC"
        d="M19.953 7.642l-1.06 1.185 1.538 1.401 1.14-1.427zM9.396 17.178l2.573 2.586-3.13 1.616-1.087-1.105z"
      />
      <g transform="translate(7 7.032)">
        <mask id="svg-pencil-edit-b" fill="#fff">
          <path d="M14.992 15.232V.008H0v15.224z" />
        </mask>
        <path
          fill="#4B57A3"
          d="M12.247 1.964l.82.831 1.041-1.058-.82-.831-1.041 1.058zm-9.358 8.145l2.156 2.19L13.217 4 11.06 1.81l-8.172 8.3zm-1.72 3.231l.694.705 2.566-1.32-1.96-1.99-1.3 2.605zm-.803 1.892a.361.361 0 0 1-.259-.109.376.376 0 0 1 0-.525l.632-.642-.275-.28a.375.375 0 0 1-.068-.431l1.646-3.298a.114.114 0 0 0 .01-.016.354.354 0 0 1 .06-.084L6.23 5.665l.052-.048L10.904.949a.363.363 0 0 1 .416.073l.41.416 1.3-1.321a.36.36 0 0 1 .518 0l1.337 1.357a.377.377 0 0 1 0 .526l-1.301 1.321.41.416a.377.377 0 0 1 0 .526l-8.69 8.824a.367.367 0 0 1-.085.062.086.086 0 0 0-.015.01L1.957 14.83a.36.36 0 0 1-.424-.069l-.276-.28-.632.642a.361.361 0 0 1-.26.11z"
          mask="url(#svg-pencil-edit-b)"
        />
      </g>
    </g>
  </svg>
);

const svgViewEl = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    xmlnsXlink="http://www.w3.org/1999/xlink"
    width="31"
    height="31"
    viewBox="0 0 31 31"
  >
    <defs>
      <path id="svg-share-view-a" d="M8.482.042H0v9.005h16.964V.042z" />
      <path id="svg-share-view-c" d="M8.482.042H0v9.005h16.964V.042z" />
    </defs>
    <g fill="none" fillRule="evenodd" transform="translate(1 1)">
      <circle cx="14.5" cy="14.5" r="14.5" fill="#D9DFF6" stroke="#4B57A3" />
      <g transform="translate(6 10.002)">
        <mask id="svg-share-view-b" fill="#fff">
          <use xlinkHref="#svg-share-view-a" />
        </mask>
        <path
          fill="#9AA5E9"
          d="M16.9 4.767c-1.762 2.573-4.884 4.28-8.417 4.28-3.539 0-6.654-1.707-8.417-4.28a.416.416 0 0 1 0-.451C1.83 1.735 4.944.042 8.483.042c3.533 0 6.655 1.693 8.417 4.274a.43.43 0 0 1 0 .45"
          mask="url(#svg-share-view-b)"
        />
      </g>
      <path
        fill="#29BDEC"
        d="M10.366 14.546c0-2.308 1.843-4.18 4.116-4.18 2.274 0 4.117 1.872 4.117 4.18 0 2.309-1.843 4.18-4.117 4.18-2.273 0-4.116-1.871-4.116-4.18"
      />
      <path
        fill="#CDD1F1"
        d="M13.217 14.546c0-.71.566-1.285 1.265-1.285s1.265.576 1.265 1.285c0 .71-.566 1.285-1.265 1.285a1.275 1.275 0 0 1-1.265-1.285"
      />
      <g transform="translate(6 10.002)">
        <mask id="d" fill="#fff">
          <use xlinkHref="#svg-share-view-c" />
        </mask>
        <path
          fill="#4B57A3"
          d="M9.447 4.545a.97.97 0 0 1-.964.978.965.965 0 0 1-.963-.978.96.96 0 0 1 .963-.979c.533 0 .964.43.964.979m.772 0c0-.972-.786-1.763-1.736-1.763-.956 0-1.735.791-1.735 1.763 0 .97.78 1.762 1.735 1.762.95 0 1.736-.791 1.736-1.762m.915 3.35a4.336 4.336 0 0 0 1.592-3.35c0-1.353-.629-2.56-1.592-3.351 2.05.569 3.792 1.769 4.953 3.35-1.168 1.582-2.903 2.782-4.953 3.352M.88 4.545c1.162-1.582 2.904-2.782 4.954-3.351a4.314 4.314 0 0 0-1.592 3.35c0 1.353.622 2.56 1.592 3.352-2.05-.57-3.792-1.77-4.954-3.351m4.134 0c0-1.95 1.544-3.525 3.47-3.525 1.92 0 3.471 1.575 3.471 3.525s-1.55 3.524-3.47 3.524c-1.927 0-3.471-1.575-3.471-3.524m11.887-.23C15.138 1.736 12.016.043 8.483.043 4.944.042 1.83 1.735.066 4.316a.416.416 0 0 0 0 .45C1.83 7.34 4.944 9.048 8.483 9.048c3.533 0 6.655-1.707 8.417-4.28a.43.43 0 0 0 0-.451M8.483 5.523a.965.965 0 0 1-.963-.978.96.96 0 0 1 .963-.979c.533 0 .964.43.964.979a.97.97 0 0 1-.964.978m0-2.74c-.956 0-1.735.79-1.735 1.762 0 .97.78 1.762 1.735 1.762.95 0 1.736-.791 1.736-1.762 0-.972-.786-1.763-1.736-1.763m0 2.74a.965.965 0 0 1-.963-.977.96.96 0 0 1 .963-.979c.533 0 .964.43.964.979a.97.97 0 0 1-.964.978m0-2.74c-.956 0-1.735.79-1.735 1.762 0 .97.78 1.762 1.735 1.762.95 0 1.736-.791 1.736-1.762 0-.972-.786-1.763-1.736-1.763"
          mask="url(#svg-share-view-d)"
        />
      </g>
    </g>
  </svg>
);
