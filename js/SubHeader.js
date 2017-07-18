import styled from "styled-components";
import colors from "./colors";

const SubHeader = styled.div`
  background-color: ${colors.duskTwo};
  color: white;
  a {
    color: ${colors.darkSkyBlue};
    text-decoration: none;
  }
  text-align: center;
  font-size: 14px;
  font-weight: 500;
  height: 40px;
  line-height: 40px;

  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;

  .mobile-text {
    display: none;
  }
  .desktop-text {
    display: inline;
  }
`;

export default SubHeader;
