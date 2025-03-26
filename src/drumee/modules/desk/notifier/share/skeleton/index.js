// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   TYPE : Skelton
// ==================================================================== *

// ----------------------------------------
//
// ----------------------------------------
const __general_notifier = function(_ui_, data){
  let state;
  data = data || {};
  const pfx = "desk-topbar";
  const icon_options = {
    width   : 40,
    height  : 40,
    padding : 10
  };
  const value = data.count || "";
  // share = 
  //   active    : 0
  //   className : "#{pfx}__icon share" #"desk__input-icon desk__input-icon--plus mr-30"
  //   way       : _a.outbound 
  //   mode      : 'direct'

  if (!~~value) {
    state = _a.closed;
  } else {
    state = _a.open;
  }
  const counter = { 
    show_inbound : true, 
    service    : "counter",
    className  : `${_ui_.fig.family}__digit `,
    innerClass : "share-btn-count",
    content    : value,
    mode       : "showList",
    way        : _a.inbound, 
    dataset    : { 
      state
    }
  };

  const a = [
    Skeletons.Button.Svg({
      ico       : 'desktop_sharing',
      className : `${_ui_.fig.family}__icon `,
      show_inbound : false 
    }),
    Skeletons.Note(counter)
    //SKL_Note(null, value, counter)
  ];
  a.plug(_a.debug, __filename);
  return a;
};
module.exports = __general_notifier;
