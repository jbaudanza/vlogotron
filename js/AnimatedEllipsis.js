import * as React from "react";
import colors from "./colors";

type PropTypes = {
  className?: string
};

export default function AnimatedEllipsis(props: PropTypes) {
  return (
    <svg
      width="25px"
      height="25px"
      className={props.className}
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid"
    >
      <circle cx="84" cy="50" r="0" fill={colors.lightBlueGreyTwo}>
        <animate
          attributeName="r"
          values="10;0;0;0;0"
          keyTimes="0;0.25;0.5;0.75;1"
          keySplines="0 0.5 0.5 1;0 0.5 0.5 1;0 0.5 0.5 1;0 0.5 0.5 1"
          calcMode="spline"
          dur="1s"
          repeatCount="indefinite"
          begin="0s"
        />
        <animate
          attributeName="cx"
          values="84;84;84;84;84"
          keyTimes="0;0.25;0.5;0.75;1"
          keySplines="0 0.5 0.5 1;0 0.5 0.5 1;0 0.5 0.5 1;0 0.5 0.5 1"
          calcMode="spline"
          dur="1s"
          repeatCount="indefinite"
          begin="0s"
        />
      </circle>
      <circle cx="84" cy="50" r="0.029191" fill={colors.slateGrey}>
        <animate
          attributeName="r"
          values="0;10;10;10;0"
          keyTimes="0;0.25;0.5;0.75;1"
          keySplines="0 0.5 0.5 1;0 0.5 0.5 1;0 0.5 0.5 1;0 0.5 0.5 1"
          calcMode="spline"
          dur="1s"
          repeatCount="indefinite"
          begin="-0.5s"
        />
        <animate
          attributeName="cx"
          values="16;16;50;84;84"
          keyTimes="0;0.25;0.5;0.75;1"
          keySplines="0 0.5 0.5 1;0 0.5 0.5 1;0 0.5 0.5 1;0 0.5 0.5 1"
          calcMode="spline"
          dur="1s"
          repeatCount="indefinite"
          begin="-0.5s"
        />
      </circle>
      <circle cx="83.9008" cy="50" r="10" fill={colors.blueGrey}>
        <animate
          attributeName="r"
          values="0;10;10;10;0"
          keyTimes="0;0.25;0.5;0.75;1"
          keySplines="0 0.5 0.5 1;0 0.5 0.5 1;0 0.5 0.5 1;0 0.5 0.5 1"
          calcMode="spline"
          dur="1s"
          repeatCount="indefinite"
          begin="-0.25s"
        />
        <animate
          attributeName="cx"
          values="16;16;50;84;84"
          keyTimes="0;0.25;0.5;0.75;1"
          keySplines="0 0.5 0.5 1;0 0.5 0.5 1;0 0.5 0.5 1;0 0.5 0.5 1"
          calcMode="spline"
          dur="1s"
          repeatCount="indefinite"
          begin="-0.25s"
        />
      </circle>
      <circle cx="49.9008" cy="50" r="10" fill={colors.purple}>
        <animate
          attributeName="r"
          values="0;10;10;10;0"
          keyTimes="0;0.25;0.5;0.75;1"
          keySplines="0 0.5 0.5 1;0 0.5 0.5 1;0 0.5 0.5 1;0 0.5 0.5 1"
          calcMode="spline"
          dur="1s"
          repeatCount="indefinite"
          begin="0s"
        />
        <animate
          attributeName="cx"
          values="16;16;50;84;84"
          keyTimes="0;0.25;0.5;0.75;1"
          keySplines="0 0.5 0.5 1;0 0.5 0.5 1;0 0.5 0.5 1;0 0.5 0.5 1"
          calcMode="spline"
          dur="1s"
          repeatCount="indefinite"
          begin="0s"
        />
      </circle>
      <circle cx="16" cy="50" r="9.97081" fill={colors.lightBlueGreyTwo}>
        <animate
          attributeName="r"
          values="0;0;10;10;10"
          keyTimes="0;0.25;0.5;0.75;1"
          keySplines="0 0.5 0.5 1;0 0.5 0.5 1;0 0.5 0.5 1;0 0.5 0.5 1"
          calcMode="spline"
          dur="1s"
          repeatCount="indefinite"
          begin="0s"
        />
        <animate
          attributeName="cx"
          values="16;16;16;50;84"
          keyTimes="0;0.25;0.5;0.75;1"
          keySplines="0 0.5 0.5 1;0 0.5 0.5 1;0 0.5 0.5 1;0 0.5 0.5 1"
          calcMode="spline"
          dur="1s"
          repeatCount="indefinite"
          begin="0s"
        />
      </circle>
    </svg>
  );
}
