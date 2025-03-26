// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : sandbox/skeleton/images-list
//   TYPE :
// ==================================================================== *
const _defaultText = `In this example, you can try to add your own objects into LETC tree<br> \
Either you're a lazy personne like me, you may just want to look for something that already \
exists and write a small snippet that wrap the vendor code into Drumee environment. In this case, \
all the vendor stuffs goes into vendorOpt aoption. Each element will be injected into \
the page header, with key being HTML tagname and attributes HTML attributes.<br> \
Or you like reinventing the wheel. That means you don't need at all vendorOpt!<br> \
Just use the option <u>creator</u> to tell LETC where to find all the code \
that shall render and handle your object.<br> \
In both cases, the only thing you need to knok is to make your snippet inherit \
from a LETC object named Letc.snippet. <br> \
Indeed, your code starts with this line, when everything you need is read. <br> \
Letc.snippet.prototype.onStart = function() {...}\
`;
// ===========================================================
// __sandbox_tips
//
// @param [Object] view
// @param [Object] label
//
// @return [Object]
//
// ===========================================================
const __sandbox_tips = function(view) {
  const kids = SKL_Box_H(view,{
    sys_pn    : "tips",
    className : "snippet",
    handler : {
      ui : view
    },      
    signal  : _e.ui.event,
    service : "load",
    name    : "__snippet",
    kids : [{
      active : 0,
      kind: KIND.note,
      className : "tips",
      content:  _defaultText,
      styleOpt : {
        padding: 10
      }
    }]
  });
  const a = {
    kind      : KIND.list.stream, 
    flow      : _a.vertical,
    styleOpt  : {
      width     : window.innerWidth - 800,
      height    : 150
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
module.exports = __sandbox_tips;
