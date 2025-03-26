// ==================================================================== *
//   Copyright Xialia.com  2011-2022
//   FILE : ui/src/drumee/builtins/window/hub/sharebox/skeleton/main.coffee
//   TYPE : Skeleton
// ==================================================================== *

// ===========================================================
//
// ===========================================================
const __hub_project_main = function(_ui_) {
 
    
  const header = Skeletons.Box.X({
    className : `${_ui_.fig.family}__topbar u-jc-center`,
    kids: [
      Preset.Button.Close(_ui_),

      Skeletons.Note({
        content   : LOCALE.NEW_EXTERNAL_SHARING_BOX,
        sys_pn    : _a.header,
        flow      : _a.y, 
        className : `${_ui_.fig.family}__topbar title u-jc-center`
      })
    ]});

  const shareBoxName = Skeletons.EntryBox({
    className   : `${_ui_.fig.family}__entry`,
    placeholder : LOCALE.SHARE_BOX_NAME,
    sys_pn      : "ref-name",
    mode        : _a.interactive,
    preselect   : 1,
    uiHandler   : _ui_,
    part        : _ui_,
    service     : _a.name,
    formItem    : 'name',
    value       : '',
    // type        : _a.textarea
    formcomplete: _a.off,
    showError   : true,
    validators   : [
      { reason: LOCALE.NAME_REQUIRE , comply: Validator.require }
    ]});

  // emails =
  //   kind    : 'widget_invitation_email',
  //   sys_pn  : 'widget_invitation-email'

  const emails = {  
    kind          : 'widget_simple_invitation',
    sys_pn        : 'widget_invitation-email',
    uiHandler     : [_ui_],
    preselect     : 0
  };
          

  const body = Skeletons.Box.Y({
    className : `${_ui_.fig.family}__main`,
    sys_pn    : _a.body,
    uiHandler     : _ui_,
    debug     : __filename,
    kids:[
      Skeletons.Box.Y({
        className: `${_ui_.fig.family}__container-body --body mt-20`,
        kids: [
          Skeletons.Box.X({
            className: `${_ui_.fig.family}__share-box-name-holder`,
            kids: [
              shareBoxName
            ]}),
          
           Skeletons.Box.Y({
            className: `${_ui_.fig.family}__container-invitation`,
            kids: [
              Skeletons.Box.X({
                className : `${_ui_.fig.family}__access-list title`,
                kids      : [
                  Skeletons.Note({
                    className  : `${_ui_.fig.family}__note access-list-title`,
                    content    : LOCALE.ACCESS_LIST
                  })
                ]}),
              emails
            ]}),

          require('./options_list').default(_ui_),

          Skeletons.Box.Y({
            className : `${_ui_.fig.family}__settings-wrapper`,
            kids: [
              Skeletons.Box.Y({
                className : `${_ui_.fig.family}__permissions-holder holder-wrapper`,
                sys_pn    : 'permissions-setting',
                uiHandler : _ui_,
                dataset   : { 
                  state   : _a.closed
                },
                kids:[
                  require('./permissions').default(_ui_)
                ]}),
              Skeletons.Box.Y({
                className : `${_ui_.fig.family}__validity-holder holder-wrapper`,
                sys_pn    : 'validity-setting',
                uiHandler : _ui_,
                dataset   : { 
                  state   : _a.closed
                },
                kids:[
                  require('./valid-until').default(_ui_)
                ]}),
              Skeletons.Box.Y({
                className : `${_ui_.fig.family}__password-holder holder-wrapper`,
                sys_pn    : 'password-setting',
                uiHandler : _ui_,
                dataset   : { 
                  state   : _a.closed
                },
                kids:[
                  require('./password').default(_ui_)
                ]})
            ]})  
        ]})
    ]}); 
  

    
  const footer = Skeletons.Box.X({
    className : `${_ui_.fig.family}__container --footer u-jc-center pb-28`,
    sys_pn    : "ref-commands",
    dataset   : {
      active  : 0
    },
    kids      : [
      Skeletons.Note({
        content :  LOCALE.CREATE,
        cn      : 'btn--confirm',
        service : _e.create,
        uiHandler   : _ui_
      })
    ]});

  const wrapper = Skeletons.Wrapper.Y({
    name      : "availability",
    part      : _ui_,
    className : `${_ui_.fig.family}__wrapper`
  }); 
      

  const a = [header, body, wrapper, footer];
  a.plug({ 
    debug : __filename});
  return a;
};
module.exports = __hub_project_main;
