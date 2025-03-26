// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *
const _public_link = function(_ui_) {

  const link_icon = Skeletons.Button.Svg({
    ico          : "desktop__link",
    className    : `${_ui_.fig.family}__icon`,
    uiHandler    : _ui_
  });

  const title = Skeletons.Box.Y({
    className: `${_ui_.fig.family}__content`, // public-link__content"
    kids: [
      Skeletons.Note({
        content   : LOCALE.ACTIVE_PUBLIC_LINK, //_I.CREATED_PUBLIC_LINK #
        className : `${_ui_.fig.family}__header`
      }),  

      Skeletons.Note({
        content   : _ui_.mget(_a.link),
        service   : "view-link",
        uiHandler : _ui_, 
        className : `${_ui_.fig.family}__link`
      })  
    ]});


  const icons = Skeletons.Box.X({
    className : `px-70 ${_ui_.fig.family}__command icons`,
    kids: [
      Skeletons.Button.Svg({
        ico       : "desktop__cog",
        uiHandler : _ui_, 
        service   : _e.settings,
        sys_pn    : "ref-settings",
        className : `${_ui_.fig.family}__icon settings`,
        state     : 0
      }),

      Skeletons.Button.Svg({
        ico       : 'desktop_copy',
        uiHandler : _ui_, 
        service   : _e.copy,
        className : `${_ui_.fig.family}__icon copy`
      }),

      Skeletons.Button.Svg({
        ico       : 'desktop_delete',
        uiHandler : _ui_, 
        className : `${_ui_.fig.family}__icon delete `,
        service   : "remove-link"
      })
    ]});

  const commands = Skeletons.Box.X({
    className : `${_ui_.fig.family}__command button`,
    kids: [
      Skeletons.Note({
        content   : LOCALE.CLOSE,
        uiHandler : _ui_, 
        service   : _a.back,
        className : `${_ui_.fig.family}__btn back`
      })
    ]});
   
  const a = [
    Skeletons.Box.Y({
      className: `${_ui_.fig.family}__main`,
      kids: [ title, icons, commands ]}),
    Skeletons.Wrapper.Y({
      name      : "dialog",
      className : `${_ui_.fig.family}__wrapper`
    })
  ];
  a.plug(_a.debug, __filename);
  return a;
};
module.exports = _public_link;