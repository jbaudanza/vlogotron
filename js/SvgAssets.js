import React from 'react';

/**
 To add a new SVG
  - Change the root <svg> to a <symbol> and add an id.
  - Remove any xmlns attributes
  - Remove any vendor specific crap
  - Remove things like <title>, <desc>
  - Change all the attributes to react style camel case.
*/

const svgEl = (
  <svg version="1.1" style={{display: 'none'}}>
    <symbol id="video-record" viewBox="0 0 100 100" x="0px" y="0px"><path d="M50,90.10449A40.10449,40.10449,0,1,1,90.10449,50,40.15013,40.15013,0,0,1,50,90.10449Zm3.952-76.29015A36.40083,36.40083,0,1,0,86.18566,46.048,36.43855,36.43855,0,0,0,53.952,13.81434Zm4.34445,51.51281H32.31309a4.79583,4.79583,0,0,1-4.791-4.79V40.29395a4.79666,4.79666,0,0,1,4.791-4.791h25.9834a4.79666,4.79666,0,0,1,4.791,4.791v2.74512l10.80176-6.23633V64.02832L63.0875,57.791v2.74609A4.79583,4.79583,0,0,1,58.29649,65.32715Zm-25.9834-27.041a2.00969,2.00969,0,0,0-2.00781,2.00781V60.53711a2.00948,2.00948,0,0,0,2.00781,2.00684h25.9834a2.00948,2.00948,0,0,0,2.00781-2.00684V52.9707L71.10606,59.208V41.623L60.3043,47.85938V40.29395a2.00969,2.00969,0,0,0-2.00781-2.00781H32.31309Z"></path></symbol>
  </svg>
)

export default function SvgAssets() {
  return svgEl;
}