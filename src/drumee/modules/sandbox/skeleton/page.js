// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : builtins/sandbox/skeleton/svg
//   TYPE :
// ==================================================================== *

// ===========================================================
// __sandbox_buttons
//
// @param [Object] view
// @return [Object]
//
// ===========================================================
const __sandbox_buttons = function(view) {
  const tips = Skeletons.Note({
    className : 'item-tips',
    content: "Nesting page in a box.",
    styleOpt : {
      padding: 10
    }
  });

  const btn = Skeletons.Note({
    content   : "Click here to see natural page.",
    href      : "#!letc",
    styleOpt  : {
      padding : 10,
      margin  : "0 auto 20px auto"
    }
  });

  const page = {
    kind : "page",
    src: "letc",
    styleOpt: {
      "background-color": "rgba(55, 55, 55, 0.6)",
      "box-shadow": "0 1px 3px 1px rgba(0, 0, 0, 0.17)",
      height: _a.auto,
      margin: _a.auto,
      left: 90,
      "min-width": 0,
      padding: "8px",
      top: 150,
      width: 500
    }
  };

  const a = Skeletons.Box.Y({
    styleOpt : {
      width : "100%",
      height : 300
    },
    kids:[tips, btn, page]});

  return a;
};

module.exports =  __sandbox_buttons;
