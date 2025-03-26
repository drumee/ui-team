// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : desk/skeleton/project-room/privilege
//   TYPE : 
// ==================================================================== *

// ===========================================================
// __project_room_privilege
//
// @param [Object] desk_ui
//
// @return [Object] 
//
// ===========================================================
const __project_room_privilege = function(manager, type, options) {
  // _dbg '_desk_sharing_privilege !!!!', options, parseInt(options)
  // viewInitial = 0
  // downloadInitial = 0
  // modifyInitial = 0
  let blockHeader, id, privilege, service;
  if (type === "room-rights") {
    blockHeader = LOCALE.PRIVILEGE;
    service     = 'validate-access';
    privilege   = parseInt(options) || 15;
    id          = "";
  } else { 
    blockHeader = LOCALE.ACCESS_PERMISSION;
    service = 'validate-user-access';
    privilege = parseInt(options.privilege);
    ({
      id
    } = options);
  }

  // switch parseInt(privilege)
  //   when _K.privilege.read
  //     viewInitial = 1
  //     _dbg '_desk_sharing_privilege 1'
  //   when _K.privilege.write
  //     downloadInitial = 1
  //     _dbg '_desk_sharing_privilege 2'
  //   when _K.privilege.delete
  //     modifyInitial = 1
  //     _dbg '_desk_sharing_privilege 16'
  //   else 
  //     viewInitial = 1
  //     _dbg '_desk_sharing_privilege no options'

  const svg_option_icon = {
    width: _K.size.full,
    height: 14,
    padding: 0
  };

  const channel = _.uniqueId();

  _dbg("privilegeprivilegeprivilegeprivilege", privilege, _K.privilege.read, _K.privilege.write, _K.privilege.delete, toggleState(privilege === _K.privilege.view), Utils.toggleState(privilege ===  _K.privilege.download), Utils.toggleState(privilege === _K.privilege.modify));

  const form_one = {
    kind      : KIND.form,
    flow      : _a.vertical,
    name      : 'privilege-selector',
    signal    : _e.ui.event,
    service   : 'privilege-selector',
    sys_pn    : 'privilege-selector',
    handler   : {
      uiHandler   : manager
    },
    kids      : [
      SKL_SVG_LABEL("account_check", {
        radio         : channel,
        initialState  : toggleState(privilege === _K.privilege.read), //viewInitial
        label         : LOCALE.VIEW, //LOCALE.VIEW
        name          : "view",
        service       : 'view',
        reference     : _a.state, // use state instead of value
        className     : 'option__checkbox option__text my-5 u-fd-row'
      }, svg_option_icon),
      SKL_SVG_LABEL("account_check", {
        radio         : channel,
        initialState  : toggleState(privilege === _K.privilege.write),  //downloadInitial
        label         : LOCALE.DOWNLOAD, //LOCALE.DOWNLOAD
        name          : _a.download,
        reference     : _a.state, // use state instead of value
        service       : _a.download,
        className     : 'option__checkbox option__text my-5 u-fd-row'
      }, svg_option_icon),
      SKL_SVG_LABEL("account_check", {
        radio         : channel,
        initialState  : toggleState(privilege === _K.privilege.delete),  //modifyInitial
        label         :  LOCALE.MODIFY, //LOCALE.MODIFY
        reference     : _a.state, // use state instead of value
        name          : "modify",
        service       : 'modify',
        className     : 'option__checkbox option__text my-5 u-fd-row'
      }, svg_option_icon)
    ]
  };

  const button = SKL_Box_V(manager, {
    kids: [
      SKL_Note(_e.share, 'Validate', {
        service,
        className : 'share-popup__modal-btn mt-12 mb-15',
        id
      })
    ]
  });

  const header = SKL_Note(null, blockHeader, {className: "project-room__access-header u-jc-center mb-10"});

  const a = {  
    kind      : KIND.box,
    flow      : _a.vertical,
    name      : 'room-rights',
    signal    : _e.ui.event,
    sys_pn    : "room-privilege",
    className : "option__block option__block--white mb-10",
    kids      : [
      header,
      form_one,
      button
    ]
  };

  if (__BUILD__ === 'dev') { DBG_PATH(a, 'desk/skeleton/project-room/privilege'); }
  return a;
};
module.exports = __project_room_privilege;
