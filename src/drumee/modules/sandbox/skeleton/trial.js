// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : builtins/sandbox/skeleton/leaflet
//   TYPE :
// ==================================================================== *



// EXPORTED
// -----------------------------------------------------
const __sandbox_trial = function(manager){
  let tips = { 
    kind: KIND.note,
    className : "item-tips",
    content: "Try to plug in your own work here. See example in #10"
  };

  tips = SKL_Box_H(manager, {
    className: "sandbox--radio",
    kids: [tips]
  });
  const ll = { 
    styleOpt : {
      left   : 0,
      top    : 0,
      height : window.innerHeight - 100,
      width  : "100%",
      border : "1px solid green"
    },
    creator  : `${protocol}://your.snippet.code/someshere`,
    snippets  :[{
      style         : {
        rel         : "stylesheet", 
        href        : `${protocol}://some.open.source/style.css`,
        crossorigin : ""
      }
    },{
      script   : {
        src         : `${protocol}://some.open.source/code.js`,
        crossorigin : ""
      }
    }],
    vendors  :[{
      link     : {
        rel         : "stylesheet", 
        href        : `${protocol}://some.open.source/style.css`,
        params      : "some parameter",
        crossorigin : ""
      }
    },{
      script   : {
        src         : `${protocol}://some.open.source/code.js`,
        params      : "some parameter",
        crossorigin : ""
      }
    }]
  };
  const a = SKL_Box_V(manager, {
    kids: [tips, ll]
  });
  return a;
};
module.exports = __sandbox_trial;
