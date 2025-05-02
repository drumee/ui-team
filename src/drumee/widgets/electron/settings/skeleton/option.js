
const __option = function (_ui_, action, title, tooltips) {
  let fig = _ui_.fig.family;
  //const {fromBitwise} = require('../../flags-utils');
  let flags = _ui_.mget('flags') || 0;
  // let diode = flags & 0b100;
  // flags = flags & 0b011;
  // let state = 0;
  // for(var k in map){
  //   if(map[k]&flags){
  //     state = Utils.toggleState(k == action);
  //   }
  // }
  const {state, diode} = fromBitwise(flags, action);
  //console.log("AAAA:4", action, state, diode);
  let label = Skeletons.Box.Y({
    className: `label-wrapper ${action}`,
    kids: [
      Skeletons.Box.X({
        kids: [
          Skeletons.Button.Svg({
            radio: `sync-option-${_ui_.cid}`,
            ico: "account_check",
            service: _e.select,
            className: `checkbox`,
            name: action,
            initialState :state,
            formItem : action
          }),
          Skeletons.Note({
            className: `label-text`,
            content: title
          }),
          Skeletons.Button.Svg({
            className: `tooltips-trigger`,
            radiotoggle: `${_ui_.cid}-tooltips`,
            ico: "info",
            service: "toggle-tooltips",
            name: action,
            text : tooltips
          }),
        ]
      }),
    ]
  });


  let radio = Skeletons.Box.X({
    className: `${fig}__radiotoggle ${action}`, 
    service: 'anti-ransomeware',
    kids: [
      Skeletons.Button.Svg({
        ico: "account_check",
        //toggle: `${action}-diode`,
        className: `togglebox`,
        sys_pn : `${action}-diode`,
        state :diode,
      }),
      Skeletons.Note({
        className: `radio-button ${action}`,
        content: LOCALE.ANTI_RANSOMWARE,
      }),
    ]
  });

  let row = Skeletons.Box.Y({
    sys_pn: action,
    type: _a.row,
    className: `${fig}__row ${action}`,
    //radioRecursive : 1
  })

  if (action == 'disabled') {
    row.kids = [label]
  } else {
    row.kids = [label, radio]
  }
  return row;
}


module.exports = __option;