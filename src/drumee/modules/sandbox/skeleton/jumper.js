// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : builtins/sandbox/skeleton/svg
//   TYPE :
// ==================================================================== *


const _button1 = function(view) {
  const a =  SKL_Box_V(view, {
    kids : [{
      kind : KIND.spinner.jump,
      position: "free",
      styleOpt: {
        height: "100%",
        width: "100%"
      }
    }],
    styleOpt: {
      "background-color": "rgba(255, 255, 255, 0.6)",
      "box-shadow": "0 1px 3px 1px rgba(0, 0, 0, 0.17)",
      height: 200,
      width: 200
    }
  });

  return a; 
};



// ===========================================================
// __sandbox_svg
//
// @param [Object] view
// @return [Object]
//
// ===========================================================
const __sandbox_svg = function(view) {
  const tips = { 
    kind: KIND.note,
    className : "item-tips",
    content: "Place the jumper at the center of the box."
  };
  const a = SKL_Box_V(view, {
    styleOpt : {
      width : "100%",
      height : "100%"
    },
    kids:[tips, _button1()]
  });
  return a;
};

module.exports =  __sandbox_svg;
