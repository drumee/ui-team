// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : builtins/sandbox/skeleton/svg
//   TYPE :
// ==================================================================== *

const _button1 = function() {
  const a = {
    kind : "image_svg",
    chartId: "drumee-play",
    className: "helpers__button-styling",
    content: "x",
    iconPosition: "no-text",
    innerClass: "icon_button",
    justify: "center",
    label: "Icon with label",
    noText: 1,
    position: "free",
    style: {
      "background-color": "rgba(255, 255, 255, 0.6)",
      "box-shadow": "0 1px 3px 1px rgba(0, 0, 0, 0.17)",
      height: 55,
      left: 50,
      "min-width": 0,
      padding: "8px",
      top: 50,
      width: 164
    },
    styleIcon: {
      height: "14px",
      width: "14px"
    }
  };
  return a; 
};

const _button2 = function() {
  const a = {
    kind : "image_svg",
    chartId: "drumee-site",
    className: "helpers__button-styling",
    content: "My label",
    iconPosition: "top",
    innerClass: "icon_button",
    justify: "center",
    noText: 0,
    position: "free",
    style: {
      "background-color": "rgba(255, 255, 255, 0.6)",
      "box-shadow": "0 1px 3px 1px rgba(0, 0, 0, 0.17)",
      height: 55,
      left: 90,
      "min-width": 0,
      padding: "8px",
      top: 150,
      width: 164
    },
    styleIcon: {
      height: "14px",
      width: "14px"
    }
  };
  return a; 
};



// ===========================================================
// __sandbox_buttons
//
// @param [Object] view
// @return [Object]
//
// ===========================================================
const __sandbox_buttons = function(view) {
  const tips = { 
    kind: KIND.note,
    className : 'item-tips',
    content: "Change buttons properties to what you want.",
    style : {
      padding: 10
    }
  };
  const a = SKL_Box_V(view, {
    style : {
      width : "100%",
      height : 300
    },
    kids:[tips, _button1(), _button2()]
  });
  return a;
};

module.exports =  __sandbox_buttons;
