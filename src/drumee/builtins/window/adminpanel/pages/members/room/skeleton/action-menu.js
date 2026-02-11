/// <reference path="../../../../../../../../../@types/index.d.ts" />

/**
 * 
 * @param {*} ui 
 * @param {*} data 
 */
function __skl_member_room_action_menu(ui, data) {

  const menuFig = `${ui.fig.family}-menu`;

  if (!Visitor.domainCan(_K.permission.admin_member) || ui.mget('connected') == 0) {
    return Skeletons.Box.X({});
  }


  let menuKids = [];


  const menuTrigger = Skeletons.Button.Svg({
    ico: 'drumee-user-setting',//'ap-member-action-menu',
    className: `${menuFig}__icon ${menuFig}__trigger trigger-icon ap-member-action-menu`,
    // service   : 'action-menu',
    uiHandler: ui
  });

  const modifyData = Skeletons.Box.X({
    className: `${menuFig}__item`,
    service: _e.edit,
    uiHandler: ui,
    kidsOpt: {
      active: 0
    },
    kids: [
      Skeletons.Note({
        className: `${menuFig}__note menu-item`,
        content: LOCALE.MODIFY_DATA
      })
    ]
  });

  const connectionLog = Skeletons.Box.X({
    className: `${menuFig}__item`,
    service: 'connection-log',
    uiHandler: ui,
    kidsOpt: {
      active: 0
    },
    kids: [
      Skeletons.Note({
        className: `${menuFig}__note menu-item`,
        content: LOCALE.ITS_CONNECTION_LOG
      })
    ]
  });

  const security = Skeletons.Box.X({
    className: `${menuFig}__item`,
    service: 'security',
    uiHandler: ui,
    kidsOpt: {
      active: 0
    },
    kids: [
      Skeletons.Note({
        className: `${menuFig}__note menu-item`,
        content: LOCALE.SECURITY_OF_THIS_ACCOUNT
      })
    ]
  });


  const resetPassword = Skeletons.Box.X({
    className: `${menuFig}__item`,
    service: 'prompt-reset-member-password',
    uiHandler: ui,
    kidsOpt: {
      active: 0
    },
    kids: [
      Skeletons.Note({
        className: `${menuFig}__note menu-item`,
        content: LOCALE.RESET_PASSWORD//'Reset password'
      })
    ]
  });

  const changePassword = Skeletons.Box.X({
    className: `${menuFig}__item`,
    service: 'prompt-change-member-password',
    uiHandler: ui,
    kidsOpt: {
      active: 0
    },
    kids: [
      Skeletons.Note({
        className: `${menuFig}__note menu-item`,
        content: LOCALE.AD_CHANGE_PASSWORD//'Reset password'
      })
    ]
  });

  let kick_out_member = Skeletons.Box.X({
    className: `${menuFig}__item`,
    service: 'prompt-kick-out',
    uiHandler: ui,
    kidsOpt: {
      active: 0
    },
    kids: [
      Skeletons.Note({
        className: `${menuFig}__note menu-item`,
        content: LOCALE.KICK_OUT_MEMBER
      })
    ]
  });


  menuKids.push(modifyData)
  if (Visitor.domainCan(_K.permission.admin_security) && (Visitor.id != data.drumate_id)) {
    menuKids.push(connectionLog)
    menuKids.push(security)
    menuKids.push(resetPassword)
    menuKids.push(changePassword)
    menuKids.push(kick_out_member)
  }

  // if (Visitor.domainCan(_K.permission.admin_member) && (Visitor.id != data.drumate_id)) {
  //   menuKids.push(toggleArchiveMember)
  // }

  if (Visitor.id == data.drumate_id) {
    // menuKids.push(whoCanSee)
    menuKids.push(connectionLog)
    menuKids.push(security)
  }

  // if ((data.status == _a.locked) || (data.status == _a.archived)) {
  //   menuKids = []
  //   menuKids.push(connectionLog)
  //   menuKids.push(kick_out_member)
  //   menuKids.push(toggleArchiveMember)
  // }

  const menuItems = Skeletons.Box.X({
    className: `${menuFig}__items-wrapper`,
    kids: [
      Skeletons.Box.Y({
        className: `${menuFig}__item-wrapper`,
        kids: menuKids
      })
    ]
  });

  const menu = Skeletons.Box.X({
    debug: __filename,
    className: `${menuFig}__dropdown ${ui.fig.group}__dropdown`,
    kids: [{
      kind: KIND.menu.topic,
      className: `${menuFig}__wrapper ${ui.fig.group}__wrapper`,
      flow: _a.y,
      opening: _e.click,
      sys_pn: 'member-action-dropdown',
      service: 'member-action-menu',
      persistence: _a.none,
      trigger: menuTrigger,
      items: menuItems,
      offsetY: 20
    }]
  });

  return menu;
};


export default __skl_member_room_action_menu;