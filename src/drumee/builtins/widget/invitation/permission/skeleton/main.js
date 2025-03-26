const { toggleState } = require("core/utils")
const __invitation_permission = function (_ui_) {
  let needle, state;
  const priv = ~~_ui_.model.get(_a.permission) || _ui_.model.get(_a.privilege);
  const hours = ~~_ui_.model.get(_a.hours);
  const days = ~~_ui_.model.get(_a.days);

  if (toggleState(days | hours)) {
    state = _a.open;
  } else {
    state = _a.closed;
  }
  const svg_option_icon = {
    width: _K.size.full,
    height: 14,
    padding: 0
  };

  const channel = _.uniqueId();

  const button = Skeletons.Box.Y({
    service: _e.close,
    uiHandler: _ui_,
    kids: [
      SKL_Note(null, LOCALE.OK, {
        active: 0,
        className: `${_ui_.fig.family}__btn`
      })
    ]
  });
  let content = [
    SKL_SVG_LABEL("available", {
      radio: channel,
      initialState: toggleState(priv & _K.permission.read),
      label: LOCALE.PERMISSION_READ,
      name: _a.read,
      reference: _a.state, // use state instead of value
      bubble: 1,
      className: `${_ui_.fig.family}__checkbox ${_ui_.fig.family}__text my-5 u-fd-row`
    }, svg_option_icon),
    SKL_SVG_LABEL("available", {
      radio: channel,
      initialState: toggleState(priv & _K.permission.write), //downloadInitial
      label: LOCALE.PERMISSION_UPLOAD_DOWNLOAD,
      reference: _a.state,
      bubble: 1,
      name: _a.write,
      className: `${_ui_.fig.family}__checkbox ${_ui_.fig.family}__text my-5  u-fd-row`
    }, svg_option_icon),
    SKL_SVG_LABEL("available", {
      radio: channel,
      initialState: toggleState(priv & _K.permission.delete), //modifyInitial
      label: LOCALE.PERMISSION_DELETE_ORGANIZE,
      reference: _a.state, // use state instead of value
      bubble: 1,
      name: _a.delete,
      dataset: {
        modify: _ui_.mget(_a.modify)
      },
      className: `${_ui_.fig.family}__checkbox ${_ui_.fig.family}__text my-5 u-fd-row` //option__disabled-modify
    }, svg_option_icon)
  ];
  const expiry = [
    SKL_SVG_LABEL("account_check", {
      state: toggleState(_ui_.model.get(_a.limit)),
      label: LOCALE.EXPIRY,
      reference: _a.state, // use state instead of value
      name: _a.limit,
      state: toggleState(days | hours),
      bubble: 1,
      className: `${_ui_.fig.family}__radio  ${_ui_.fig.family}__text my-5 u-fd-row`
    }, svg_option_icon),

    Skeletons.Box.X({
      className: "py-2 pl-24 u-ai-center mb-17",
      sys_pn: "wrapper-expiry",
      part: _ui_,
      dataset: {
        state
      },
      kids: [
        Skeletons.Entry({
          className: `${_ui_.fig.family}__input mr-5`,
          name: _a.days,
          uiHandler: _ui_,
          placeholder: `${days}`,
          sys_pn: "ref-days",
          bubble: 1,
          value: days //cmd.model.get(_a.days) #days_value
          // bubble      : 1
        }),
        Skeletons.Note(LOCALE.DAYS, `${_ui_.fig.family}__text  mr-5`),
        Skeletons.Entry({
          className: `${_ui_.fig.family}__input mr-5`,
          name: _a.hours,
          uiHandler: _ui_,
          bubble: 1,
          value: hours, //dhours_value
          placeholder: `${hours}`
        }),
        Skeletons.Note(LOCALE.HOURS, `${_ui_.fig.family}__text`)
      ]
    })
  ];

  if ((needle = _ui_.mget(_a.mode), [_a.admin, _a.owner].includes(needle))) {
    content = expiry;
  } else {
    content = content.concat(expiry);
  }
  //@debug "DGDGDGD", content
  const form = {
    kind: KIND.form,
    flow: _a.y,
    debug: __filename,
    mode: _a.interactive,
    uiHandler: _ui_,
    kids: content
  };
  const a = [form, button];
  return a;
};
module.exports = __invitation_permission;
