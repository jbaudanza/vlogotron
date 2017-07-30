/* @flow */

import React from "react";

import colors from "./colors";

import Link from "./Link";

import styled from "styled-components";

class NotificationPopup extends React.Component {
  render() {
    const name = "Jonathan";
    const avatar = (
      <img
        width={50}
        height={50}
        src="https://lh5.googleusercontent.com/-ZOYEtSkY-kg/AAAAAAAAAAI/AAAAAAAABHg/eKUqXXkA_yk/photo.jpg"
      />
    );
    //const avatar = robotSvg;

    return (
      <div className={this.props.className}>
        <AvatarWrapper>
          {avatar}
        </AvatarWrapper>
        <p>
          {name} needs your help finishing this song. Pick a square
          with a robot in it and click the
          <CameraIcon /> icon
          to replace the robot with your own voice.
        </p>
        <p>
          Watch this
          {" "}
          <a href="http://www.example.com">Tutorial video</a>
          {" "}
          for more instructions.
        </p>
        <CloseLink href="#">
          <svg version="1.1" width="13px" height="14px">
            <use xlinkHref="#svg-close" />
          </svg>
        </CloseLink>
      </div>
    );
  }
}

const avatarSize = 50;

const AvatarWrapper = styled.div`
  border: 4px solid #fff;
  position: absolute;
  top: -29px;
  left: 50%;
  margin-left: ${-avatarSize / 2}px;
  width: ${avatarSize}px;
  height: ${avatarSize}px;
  border-radius: ${avatarSize}px;
  overflow: hidden;
  background-color: #CDD6F4;
`;

const CloseLink = styled(Link)`
  position: absolute;
  right: 9px;
  top: 9px;
`;

const CameraIconWrapper = styled.span`
  display: inline-block;
  width: 20px;
  height: 10px;
  overflow: hidden;
  margin: 0 2px;

  svg {
    margin-top: -5px;
    stroke: #333;
  }
`;

function CameraIcon(props) {
  return (
    <CameraIconWrapper>
      <svg version="1.1" width="20px" height="25px">
        <use xlinkHref="#svg-camera" />
      </svg>
    </CameraIconWrapper>
  );
}

const robotSvg = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    xmlnsXlink="http://www.w3.org/1999/xlink"
    width="51"
    height="51"
    viewBox="0 0 51 51"
  >
    <defs>
      <path id="svg-robot-avatar-a" d="M0 28.282h32.994V.092H0z" />
    </defs>
    <g fill="none" fillRule="evenodd" transform="translate(2 2)">
      <path fill={colors.darkSkyBlue} d="M22.387 14.983h1.928v-3.06h-1.928z" />
      <g transform="translate(7 7.027)">
        <path
          fill={colors.darkSkyBlue}
          d="M14.178 2.91c0-1.225.973-2.218 2.173-2.218 1.2 0 2.172.993 2.172 2.217 0 1.225-.972 2.217-2.172 2.217-1.2 0-2.173-.992-2.173-2.217zM5.754 19.24c0 1.126-.983 2.038-2.196 2.038h-.775c-1.213 0-2.196-.912-2.196-2.038 0-1.125.983-2.037 2.196-2.037h.775c1.213 0 2.196.912 2.196 2.037M32.06 19.24c0 1.126-.983 2.038-2.196 2.038h-.775c-1.213 0-2.196-.912-2.196-2.038 0-1.125.983-2.037 2.196-2.037h.775c1.213 0 2.196.912 2.196 2.037"
        />
        <path
          fill="#8C9EE0"
          d="M27.728 24.938c0 1.324-1.052 2.397-2.35 2.397H7.324c-1.297 0-2.349-1.073-2.349-2.397V13.504c0-1.324 1.052-2.397 2.349-2.397h18.056c1.297 0 2.349 1.073 2.349 2.397v11.434z"
        />
        <path
          fill={colors.purple}
          d="M7.105 11.397c-.971 0-1.762.806-1.762 1.798v12.091c0 .991.79 1.798 1.762 1.798h18.79c.971 0 1.762-.807 1.762-1.798V13.195c0-.992-.79-1.798-1.762-1.798H7.105zm18.79 16.885H7.105c-1.619 0-2.936-1.344-2.936-2.996V13.195c0-1.652 1.317-2.996 2.936-2.996h18.79c1.619 0 2.936 1.344 2.936 2.996v12.091c0 1.652-1.317 2.996-2.936 2.996z"
        />
        <path
          fill={colors.purple}
          d="M5.109 21.877H2.23C1.001 21.877 0 20.694 0 19.24c0-1.453 1-2.636 2.231-2.636H5.11v1.198H2.23c-.573 0-1.057.659-1.057 1.438 0 .78.484 1.438 1.057 1.438H5.11v1.199zM30.763 21.877h-2.877v-1.199h2.877c.573 0 1.057-.658 1.057-1.438 0-.78-.484-1.438-1.057-1.438h-2.877v-1.198h2.877c1.23 0 2.231 1.183 2.231 2.636 0 1.454-1 2.637-2.23 2.637M10.578 17.802c-.777 0-1.41.645-1.41 1.438 0 .793.633 1.438 1.41 1.438.777 0 1.409-.645 1.409-1.438 0-.793-.632-1.438-1.41-1.438m0 4.075c-1.424 0-2.583-1.183-2.583-2.637 0-1.453 1.16-2.636 2.584-2.636 1.424 0 2.583 1.183 2.583 2.636 0 1.454-1.159 2.637-2.583 2.637M22.372 17.802c-.777 0-1.41.645-1.41 1.438 0 .793.633 1.438 1.41 1.438.777 0 1.41-.645 1.41-1.438 0-.793-.633-1.438-1.41-1.438m0 4.075c-1.425 0-2.584-1.183-2.584-2.637 0-1.453 1.16-2.636 2.584-2.636 1.425 0 2.584 1.183 2.584 2.636 0 1.454-1.16 2.637-2.584 2.637M16.735 24.72c-1.844 0-3.288-1.158-3.288-2.637h1.174c0 .78.968 1.439 2.114 1.439v1.198z"
        />
        <path
          fill={colors.purple}
          d="M16.559 24.72v-1.198c1.146 0 2.114-.659 2.114-1.439h1.174c0 1.479-1.444 2.637-3.288 2.637"
        />
        <mask id="svg-robot-avatar-b" fill="#fff">
          <use xlinkHref="#svg-robot-avatar-a" />
        </mask>
        <path
          fill={colors.purple}
          d="M15.974 7.357h.754V5.926h-.754v1.43zM14.8 8.555h3.102V4.727H14.8v3.828z"
          mask="url(#svg-robot-avatar-b)"
        />
        <path
          fill={colors.purple}
          d="M16.35 1.291c-.873 0-1.585.726-1.585 1.618 0 .892.712 1.618 1.586 1.618.874 0 1.585-.726 1.585-1.618 0-.892-.711-1.618-1.585-1.618m0 4.434c-1.522 0-2.76-1.263-2.76-2.816S14.829.093 16.351.093c1.522 0 2.76 1.263 2.76 2.816s-1.238 2.816-2.76 2.816"
          mask="url(#b)"
        />
        <path
          fill="#FFF"
          d="M8.973 19.22c0-.904.718-1.637 1.605-1.637.886 0 1.605.733 1.605 1.638 0 .904-.719 1.638-1.605 1.638-.887 0-1.605-.734-1.605-1.638M20.767 19.22c0-.904.719-1.637 1.605-1.637s1.605.733 1.605 1.638c0 .904-.719 1.638-1.605 1.638s-1.605-.734-1.605-1.638"
          mask="url(#b)"
        />
        <path
          fill="#8C9EE0"
          d="M11.597 18.921c0 .348-.276.63-.617.63a.623.623 0 0 1-.616-.63c0-.347.276-.629.616-.629.341 0 .617.282.617.63M23.38 18.921c0 .348-.276.63-.617.63a.623.623 0 0 1-.616-.63c0-.347.276-.629.616-.629.34 0 .617.282.617.63"
          mask="url(#b)"
        />
      </g>
    </g>
  </svg>
);

export default styled(NotificationPopup)`
  background-color: red;
  position: fixed;
  width: 207px;
  bottom: 35px;
  right: 22px;
  border-radius: 4px;
  background-color: #fff;
  box-shadow: 0 2px 4px 0 ${colors.lightBlueGreyTwo};

  padding: 30px 15px 15px 15px;
  box-sizing: border-box;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.2px;
  line-height: 1.5;
  text-align: center;
  color: ${colors.greyishBrown};

  a {
    color: ${colors.duskyBlue};
    text-decoration: none;
  }
`;
