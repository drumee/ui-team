// ============================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : src/drumee/builtins/desk/skeleton/window 
//   TYPE : 
// ============================================================== *

const __properties = function (_ui_) {
  let kids = [];
  let data;
  if(_ui_.media){
    data = _ui_.media.getAttr()
  }else{
    data = _ui_.actualNode();
  }
  const pfx = _ui_.fig.family;
  for (let k in data) {
    kids.push(Skeletons.Box.G({
      className: `${pfx}__properties-row`,
      kids: [
        Skeletons.Note({
          className: `${pfx}__properties-attr`,
          content: k
        }),
        Skeletons.Note({
          className: `${pfx}__properties-value`,
          content: data[k]
        }),
        Skeletons.Button.Svg({
          className: `${pfx}__properties-icon`,
          ico: "desktop_copy",
          service: _e.copy,
          value: data[k]
        })
      ]
    }))
  }
  return kids;


};

module.exports = __properties;
