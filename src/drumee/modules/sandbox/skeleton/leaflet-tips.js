
const _defaultText = `In this example, we don't event need <u>kind</u>. Because kinds just refer to \
list of objects existing in Drumee library. The 'L' of LETC stands for <u>Limitless</u>. \
So when you need an objects that doesn't exist in the library, you can create them on your orwn.<br> \
And if you're a lazy personne like me, you may just want to look for something that already \
exists, for instance on <a href=\`https://npmjs.com/\`>npmjs.com</a>. This example take code \
from <a href=\`https://leafletjs.com/examples/quick-start/\`>leafletjs.com</a>. \
What you need to do is to write a small snippet that wrap the vendor code into Drumee \
environment. Click here to see snippet code.<br> \
And you knwo what, the JSON editor on the left pane comes from \
<a href=\`https://www.npmjs.com/package/jsoneditor\`>here</a>, just like the example #10!\
`;

const __sandbox_tips = function(view) {
  const kids = SKL_Box_H(view,{
    sys_pn    : "tips",
    className : "snippet",
    handler : {
      ui : view
    },      
    signal  : _e.ui.event,
    service : "load",
    name    : "snippet",
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
