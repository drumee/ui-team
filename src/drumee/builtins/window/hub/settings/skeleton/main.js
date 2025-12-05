const CHANNEL = _.uniqueId();

const _field = function(ui, kind, api){
  const cn = ui.fig.family + '__item';
  const a = { 
    kind,
    hub       : ui,
    hub_id    : ui.media.mget(_a.hub_id),
    flow      : _a.x,
    sys_pn    : kind.replace("hub_", "ref-"),
    radio     : CHANNEL,
    media     : ui.media,
    authority : ui.visitor.get(_a.privilege),
    uiHandler     : ui,
    updateApi  : api || SERVICE.media.rename, 
    fig       : {
      field   : ui.fig.family
    },
    className : cn
  };
  return a; 
};

/**
 * 
 * @param {*} ui 
 * @returns 
 */
const __skl_hub_settings = function(ui) { 
  let service;
  if (ui.media.isGranted(_K.permission.owner)) {
    service = "delete-hub";
  } else { 
    service = "leave-hub";
  }
  
  const destroyIcon = Skeletons.Button.Svg({
    ico       : 'tools_delete',
    className : `${ui.fig.family}__icon destroy tools_delete`,
    service, //_e.destroy
    uiHandler : ui
  });
  const a = [
    Preset.Button.Close(ui),
    Skeletons.Note({
      content   : ui.mget(_a.label),
      className : `${ui.fig.family}__title mb-10`
    }),
    
    Skeletons.Box.Y({
      debug     : __filename, 
      className : `${ui.fig.family}__container wrapper-general`,
      kids: [
        _field(ui, 'hub_owner'),
        _field(ui, 'hub_hubname'),        
        _field(ui, 'hub_filename'),

        !ui.media.isGranted(_K.permission.owner) ?
          _field(ui, 'hub_permission') : undefined
      ]}),
    Skeletons.Box.Y({
      className: `${ui.fig.family}__container wrapper-list`, 
      sys_pn  : "container-invitation",
      kids    : [
        require('./invitation')(ui)
      ]})
  ];
  // use the bottom condition when only for delete not for leave 
  // if not Visitor.isMimicActiveUser() or not ui.media.isGranted(_K.permission.owner)
  if (!Visitor.isMimicActiveUser()) {
    a.unshift(destroyIcon);
  }
  a.plug(_a.debug, __filename);
  return a;
};
module.exports = __skl_hub_settings;
