import { injectGlobal } from "styled-components";

function defineFont(family, filename, weight, style) {
  return `
    @font-face {
      font-family: ${family};
      src: url("/fonts/${filename}.ttf") format('truetype'),
           url("/fonts/${filename}.eot") format('eot'),
           url("/fonts/${filename}.woff") format('woff'),
           url("/fonts/${filename}.woff2") format('woff2'),
           url("/fonts/${filename}.svg") format('svg');
      font-weight: ${weight};
      font-style: ${style};
    }
  `;
}

injectGlobal`
  ${defineFont("HKGrotesk", "HKGrotesk-Light", 300, "normal")}
  ${defineFont("HKGrotesk", "HKGrotesk-LightItalic", 300, "italic")}

  ${defineFont("HKGrotesk", "HKGrotesk-Regular", 400, "normal")}
  ${defineFont("HKGrotesk", "HKGrotesk-Italic", 400, "italic")}

  ${defineFont("HKGrotesk", "HKGrotesk-Medium", 500, "normal")}
  ${defineFont("HKGrotesk", "HKGrotesk-MediumItalic", 500, "italic")}

  ${defineFont("HKGrotesk", "HKGrotesk-SemiBold", 600, "normal")}
  ${defineFont("HKGrotesk", "HKGrotesk-SemiBoldItalic", 600, "italic")}

  ${defineFont("HKGrotesk", "HKGrotesk-Bold", 700, "normal")}
  ${defineFont("HKGrotesk", "HKGrotesk-BoldItalic", 700, "italic")}
`;

export const fontFamily = "HKGrotesk, sans-serif";
