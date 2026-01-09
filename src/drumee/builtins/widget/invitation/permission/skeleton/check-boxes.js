const CHANNEL = _.uniqueId();
const _row = function (ui, name, label) {
  const perm = ~~ui.mget(_a.permission);
  const state = toggleState(perm & _K.permission[name]);
  const a = Skeletons.Button.Label({
    ico: "account_check",
    uiHandler: ui,
    radio: CHANNEL,
    initialState: state, //toggleState(perm&_K.permission.download) 
    label, //LOCALE.DOWNLOAD
    labelClass: "text",
    reference: _a.state,
    service: _e.update,
    name,
    //className : "option__checkbox option__text my-5 zzz u-fd-row"
    className: `${ui.fig.family}__checkbox my-5 u-fd-row`
  });
  return a;
};

const __invitation_permission = function (manager) {
  const a = [
    _row(manager, _a.view, LOCALE.VIEW),
    _row(manager, _a.download, LOCALE.DOWNLOAD),
    _row(manager, _a.modify, LOCALE.MODIFY)
  ];
  a.plug(_a.debug, __filename);
  return a;
};
module.exports = __invitation_permission;
