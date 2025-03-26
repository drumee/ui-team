// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : builtins/sandbox/skeleton/prebuilt
//   TYPE :
// ==================================================================== *



// EXPORTED
// -----------------------------------------------------
const __sandbox_prebuilt = function(view){
  const tips = { 
    kind: KIND.note,
    className : "item-tips",
    content: `There is only tow objects described. However, there mush more object in the \
results box. Can you explain why/how?`
  };
  const section = { 
    kind: 'page',
    vhost : `letc.${Visitor.get(_a.domain)}`,
    src : `https://${Visitor.get(_a.domain)}/_/`,
    styleOpt : {
      padding: 10
    }
  };
  const a = SKL_Box_V(view, {
    className: "sandbox--wrapper",
    kids: [tips, section]
  });
  return a;
};
module.exports = __sandbox_prebuilt;
