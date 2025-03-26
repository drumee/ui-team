// ==================================================================== *
//   Copyright Xialia.com  2011-2021
//   FILE : /src/drumee/builtins/window/hub/settings/skeleton/main.coffee
//   TYPE : Skeleton
// ==================================================================== *

const CHANNEL = _.uniqueId();

const _field = function(_ui_, kind, api){
  const cn = _ui_.fig.family + '__item';
  const a = { 
    kind,
    hub       : _ui_,
    hub_id    : _ui_.media.mget(_a.hub_id),
    flow      : _a.x,
    sys_pn    : kind.replace("hub_", "ref-"),
    radio     : CHANNEL,
    media     : _ui_.media,
    authority : _ui_.visitor.get(_a.privilege),
    uiHandler     : _ui_,
    updateApi  : api || SERVICE.media.rename, 
    fig       : {
      field   : _ui_.fig.family
    },
    className : cn
  };
  return a; 
};

/**
 * 
 * @param {*} _ui_ 
 * @returns 
 */
const __skl_hub_settings = function(_ui_) { 
  let service;
  if (_ui_.media.isGranted(_K.permission.owner)) {
    service = "delete-hub";
  } else { 
    service = "leave-hub";
  }
  
  const destroyIcon = Skeletons.Button.Svg({
    ico       : 'tools_delete',
    className : `${_ui_.fig.family}__icon destroy tools_delete`,
    service, //_e.destroy
    uiHandler : _ui_
  });
  const a = [
    Preset.Button.Close(_ui_),
    Skeletons.Note({
      content   : _ui_.mget(_a.label),
      className : `${_ui_.fig.family}__title mb-10`
    }),
    
    Skeletons.Box.Y({
      debug     : __filename, 
      className : `${_ui_.fig.family}__container wrapper-general`,
      kids: [
        _field(_ui_, 'hub_owner'),
        _field(_ui_, 'hub_hubname'),        
        _field(_ui_, 'hub_filename'),

        !_ui_.media.isGranted(_K.permission.owner) ?
          _field(_ui_, 'hub_permission') : undefined
      ]}),
    Skeletons.Box.Y({
      className: `${_ui_.fig.family}__container wrapper-list`, 
      sys_pn  : "container-invitation",
      kids    : [
        require('./invitation')(_ui_)
      ]})
  ];
  // use the bottom condition when only for delete not for leave 
  // if not Visitor.isMimicActiveUser() or not _ui_.media.isGranted(_K.permission.owner)
  if (!Visitor.isMimicActiveUser()) {
    a.unshift(destroyIcon);
  }
  a.plug(_a.debug, __filename);
  return a;
};
module.exports = __skl_hub_settings;
