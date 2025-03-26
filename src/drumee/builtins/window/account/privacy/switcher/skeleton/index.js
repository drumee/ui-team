// ================================================================== *
//   Copyright Xialia.com  2011-2021
//   FILE : /src/drumee/builtins/window/account/privacy/switcher/skeleton/index.coffee
//   TYPE : Skeleton
// ===================================================================**/

// ===========================================================
//
// ===========================================================
const __skl_privacy_selector = function(_ui_) {
  const labels     = _ui_.mget(_a.labels);
  const multi_line = _ui_.mget('multi_line');
  const type = _ui_.mget(_a.name);
  const state =  toggleState(_ui_.mget(_a.state));
  const sw = [
    Skeletons.Switch({
      sys_pn : 'switch',
      state,
      values : [0, 1],
      vendorOpt : [
        {label: labels[1]},
        {label: labels[2]}
      ]})
  ];

  if(multi_line) {
    sw.push(Skeletons.Button.Svg({
      ico: "info",
      className : `${_ui_.fig.family}__info`
    })
    );
  }

  const a = Skeletons.Box.X({ 
    className : `${_ui_.fig.family}__main`,
    kids      : [
      Skeletons.Note({
        className : `${_ui_.fig.family}__text tbd`,
        content   : labels[0]}),
      
      type === _a.log ?
        Skeletons.Button.Svg({
          ico       : 'info',
          className : `${_ui_.fig.family}__info ${type}`,
          tooltips  : {
            content   : LOCALE.ACCOUNT_PRIVACY_INFO_TOOLTIP
          }
        }) : undefined,

      Skeletons.Box.X({ 
        className : `${_ui_.fig.family}__switch ${type}`,
        kids : sw
      })
    ]});

  if (multi_line) {
    a.className = `${_ui_.fig.family}__row multi-line`;
    a.kids[0].className = `${_ui_.fig.family}__text multi-line`;
  }

  return a;
};
module.exports = __skl_privacy_selector;