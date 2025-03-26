// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *


// ===========================================================
// __sb_main_outbound
//
// @param [Object] desk_ui
//
// @return [Object]
//
// ===========================================================
const __sb_main_outbound = function(_ui_) {
  const sharees    = _ui_.mget(_a.sharees);
  const invitation = { 
    kind      : 'invitation',
    media     : _ui_.referenceMedia(), //mget(_a.media)
    hub_id    : _ui_.mget(_a.hub_id),
    api       : _ui_.getApi(),
    mode      : _ui_.mget(_a.mode),
    authority : _ui_.mget(_a.authority),
    sys_pn    : "ref-invitation",
    topLabel     : LOCALE.ACCESS_LIST,
    bottomLabel  : LOCALE.CHANGE,
    sharees,
    className : "u-jc-sa",
    default_privilege : _ui_.mget(_a.default_privilege),
    partHandler : _ui_, 
    uiHandler   : _ui_
  };
  const a = [
    Preset.Button.Close(_ui_),
    require('./public-link')(_ui_),
    Skeletons.Box.Y({
      debug : __filename,
      className : `${_ui_.fig.group}__main ${_ui_.fig.family}__main pt-30 u-ai-center`,
      kids: [
        Skeletons.Wrapper.Y({
          name      : "link",
          className : `${_ui_.fig.family}__wrapper`
        }),

        // Skeletons.Box.X
        //   className : "#{_ui_.fig.family}__title u-ai-center mb-20"
        //   sys_pn    : "container-header"
        //   kids      : require('./header')(_ui_)

        Skeletons.Box.X({
          className : `${_ui_.fig.family}__container `,
          //sys_pn : "container-main"
          kids   : [invitation],
          partHandler   : _ui_,
          uiHandler  : _ui_
        })
      ]})
  ];
  a.plug(_a.debug, __filename);
  return a;
};
module.exports = __sb_main_outbound;
