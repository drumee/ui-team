
const __hub_admin_field_edit = function(_ui_) {  

  let edit;
  const id = _ui_.hub.owner.get('owner_id');

  const media = _ui_.mget(_a.media);
  if ((media != null) && (media.mget(_a.privilege) &_K.permission.owner)) {
    edit = Skeletons.Button.Svg({
      ico       : "desktop_sharebox_edit",
      className : `${_ui_.fig.field}__icon info ${_ui_.fig.group}__icon`,
      uiHandler  : _ui_,
      service   : _e.edit
    });
  } else { 
    edit = { kind : KIND.wrapper };
  }

  const kids = [    
    Skeletons.Note({
      className: `${_ui_.fig.field}__label`, //dots"
      content: _ui_.mget(_a.label)
    }),
    
    Skeletons.Box.X({
      sys_pn: "wrapper-field",
      className: `${_ui_.fig.field}__avatar-wrapper u-ai-center`, 
      kids      : [
        Skeletons.Note({
          className : `${_ui_.fig.field}__member-name`,
          content   : `${_ui_.name}`
        })
      ]}),

    Skeletons.Box.X({
      sys_pn: "wrapper-cmd",
      dataset : {
        editable : _ui_.editable
      },
      kids: [edit]})
    
  ];
  const a = [
    Skeletons.Box.X({ 
      debug     : __filename,
      className : `${_ui_.fig.family}__main`, 
      kids
    }), 
    Skeletons.Wrapper.Y({
      name : "dialog",
      className : `dialog__wrapper ${_ui_.fig.family}__dialog`
    })
  ];    
  //a.plug _a.debug, __filename
  return a; 
};
module.exports = __hub_admin_field_edit;
