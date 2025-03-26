// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : desk/counter/project/skeleton/main
//   TYPE : Skelton
// ==================================================================== *

// ===========================================================
//
// ===========================================================
const __hub_project_main = function(_ui_) {
 
  const invitation = { 
    kind      : 'invitation',
    signal    : _e.ui.event,
    service   : _e.update,
    mode      : 'direct',
    sys_pn    : "ref-invitation",
    authority : 1, // Only to supress warning
    preselect : 0,
    master    : _ui_, 
    className : "u-jc-sa",
    sharees   : [],
    modify    : _a.on,
    className : `${_ui_.fig.family}__invitation`,
    default_privilege : _K.privilege.write, 
    only_drumate : 1,
    action_bar   : 0,    
    contactbook  : 0,
    partHandler  : _ui_, 
    uiHandler    : _ui_,
    contactbook  : 1,
    addGuest     : 0 
  };
    
  const header = Skeletons.Box.X({
    className : `${_ui_.fig.family}__topbar u-jc-center`,
    kids: [
      Preset.Button.Close(_ui_),

      Skeletons.Note({
        content   : LOCALE.NEW_SHARED_FOLDER, //LOCALE.CREATE_SHAREROOM
        sys_pn    : _a.header,
        flow      : _a.y, 
        className : `${_ui_.fig.family}__topbar title u-jc-center`
      })
      
//      Skeletons.Button.Svg
//        ico       : "desktop_information--new"
//        tooltips  :
//          content : LOCALE.TOOLTIPS_CF
//          className : 'tooltips box-shadow-13'
//        className   : "#{_ui_.fig.family}__topbar icon"
      
    ]});

  const body = Skeletons.Box.Y({
    className : `${_ui_.fig.family}__main`,
    sys_pn    : _a.body,
    uiHandler     : _ui_,
    debug     : __filename,
    kids:[
      Skeletons.Box.X({
        className: `${_ui_.fig.family}__container --body mt-55`,
        kids: [
          Skeletons.EntryBox({
            className   : `${_ui_.fig.family}__entry`,
            placeholder : LOCALE.SHARED_FOLDER_NAME,//FOLDER_NAME
            sys_pn      : "ref-name",
            mode : _a.interactive,
            preselect   : 1,
            uiHandler   : _ui_,
            part        : _ui_,
            service     : _a.name,
            showError   : 1
          })
            //error_box   : _a.none
        ]}),
      invitation
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
