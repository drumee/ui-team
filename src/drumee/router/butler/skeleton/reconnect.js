// ==================================================================== *
//   Copyright Xialia.com  2011-2021
//   FILE : 
//   TYPE : 
// ==================================================================== *

const _reconnect = function (_ui_) {
  let { email } = Visitor.profile();
  let body = {
    kind: "welcome_signin",
    sys_pn: "reconnect-popup",
    uiHandler: [_ui_],
    partHandler: [_ui_],
    reconnect: 1,
    uid: Visitor.id,
    email,
    dataset: {
      mode: "reconnect",
    },
  }

  const a = Skeletons.Box.Y({
    className: `${_ui_.fig.family}__reconnect main`,
    debug: __filename,
    sys_pn: "raw-content",
    kids: [
      Preset.Button.Close(_ui_, "close-reconnect"),
      Skeletons.Box.X({
        className: `${_ui_.fig.family}__reconnect header`,
        kids: [
          Skeletons.Note({
            className: `${_ui_.fig.family}__reconnect title`,
            content: LOCALE.SESSION_EXPIRED
          })
        ]
      }),
      body
    ]
  });
  return a;
};
module.exports = _reconnect;
