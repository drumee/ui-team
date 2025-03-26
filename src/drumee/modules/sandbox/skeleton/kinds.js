/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : sandbox/skeleton/images-list
//   TYPE :
// ==================================================================== *
const _kinds = [
  KIND.box,
  KIND.note,
  KIND.svg.path,
  KIND.button.icon, 
  KIND.datepicker,
  KIND.entry,
  KIND.iframe,
  KIND.slidebar,
  KIND.svg.gradient_circle
];

const __sandbox_kinds = function(view) {
  const kids = [];
  for (var t of Array.from(_kinds)) {
    kids.push({
      kind      : KIND.note,
      className : "kind",
      content   : t,
      styleOpt  : {
        padding : 10
      }
    });
  }
  const a = {
    kind      : KIND.list.stream, 
    flow      : _a.vertical,
    styleOpt  : {
      width     : window.innerWidth - 800,
      height    : window.innerHeight - 200
    },
    vendorOpt : {
      alwaysVisible : true,
      size      : "2px",
      opacity   : "1",
      color     : "#FA8540",
      distance  : "0",    
      railVisible: true,
      railColor : "#E5E5E5",
      railOpacity: "1"
    },
    kids
  };
  return a;
};
module.exports = __sandbox_kinds;
