/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : desk/configs/list-stream
//   TYPE : configs
// ==================================================================== *

const __preset_template = { 
  Xmlns(c){
    let a;
    return a = `\
<use xmlns:xlink=\"http://www.w3.org/1999/xlink\" xlink:href=\"#--icon-${c}\"></use>\
`;
  },
  SvgText(text, cn) {
    let a;
    if (cn == null) { cn = "svg-text"; }
    text = text.slice(0,4);
    const w = text.length * 8;
    return a = `\
<svg xmlns=\"http://www.w3.org/2000/svg\" class=\"${cn}\" viewBox=\"0 0 28 29\"> \
<path fill-rule=\"evenodd\" clip-rule=\"evenodd\" d=\"M4 4C4 1.79086 5.79087 -4.71121e-06 8.00001 0L19.5751 2.46853e-05C20.6643 2.7008e-05 21.7064 0.444174 22.4607 1.22988L26.8855 5.83911C27.6007 6.58402 28 7.57662 28 8.60923V25C28 27.2091 26.2091 29 24 29H8C5.79086 29 4 27.2091 4 25V4ZM24 27.5H8C6.61929 27.5 5.5 26.3807 5.5 25V4C5.5 2.61929 6.61929 1.5 8.00001 1.5L19.5751 1.50002C20.0883 1.50003 20.5847 1.65777 21 1.9458V8H26.4246C26.4743 8.19764 26.5 8.40215 26.5 8.60923V25C26.5 26.3807 25.3807 27.5 24 27.5Z\" fill=\"#88929E\"/> \
<rect y=\"11\" width=\"${w}\" height=\"14\" rx=\"6\" fill=\"#4b5da8\"></rect> \
<text x=\"3\" y=\"21\" font-family=\"Verdana\" font-size=\"12\">${text}</text> \
</svg>\
`;
  }
};
module.exports = __preset_template;
