// ================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : /src/drumee/builtins/window/adminpanel/pages/members/room/skeleton/action-menu.js
//   TYPE : Skeleton
// ===================================================================**/
/// <reference path="../../../../../../../../../@types/index.d.ts" />

/**
 * 
 * @param {*} _ui_ 
 * @param {*} data 
 */
function __skl_member_room_action_menu(_ui_, data) {

  const menuFig = `${_ui_.fig.family}-menu`;

  if (!Visitor.domainCan(_K.permission.admin_member)) {
    return Skeletons.Box.X({});
  }

  if (
    (!Visitor.domainCan(_K.permission.admin)) &&
    (Visitor.id != _ui_._currentData.mget('drumate_id')) &&
    (Visitor.get(_a.privilege) <= _ui_._currentData.mget(_a.privilege))
  ) {
    return Skeletons.Box.X({});
  }

  let menuKids = [];

  // @ts-ignore
  //let statusDate = Dayjs.unix(data.status_date);
  // @ts-ignore
  //let now = Dayjs();
  //let dateDeff = now.diff(statusDate, 'days') + 1;


  let blockUnblockMember, blockUnblockLabel, toggleArchiveMember, archiveLabel;

  const menuTrigger = Skeletons.Button.Svg({
    ico       : 'drumee-user-setting',//'ap-member-action-menu',
    className : `${menuFig}__icon ${menuFig}__trigger trigger-icon ap-member-action-menu`,
    service   : 'action-menu',
    uiHandler : _ui_
  });

  const modifyData = Skeletons.Box.X({
    className : `${menuFig}__item`,
    service   : _e.edit,
    uiHandler : _ui_,
    kidsOpt   : {
      active : 0
    },
    kids      : [
      Skeletons.Note({
        className : `${menuFig}__note menu-item`,
        content   : LOCALE.MODIFY_DATA
      })
    ]
  });

  const whoCanSee = Skeletons.Box.X({
    className : `${menuFig}__item`,
    service   : 'choose-who-can-see-member',
    uiHandler : _ui_,
    kidsOpt   : {
      active : 0
    },
    kids      : [
      Skeletons.Note({
        className : `${menuFig}__note menu-item`,
        content   :  LOCALE.WHO_CAN_SEE //'Authorized contacts'
      })
    ]
  });

  const connectionLog = Skeletons.Box.X({
    className : `${menuFig}__item`,
    service   : 'connection-log',
    uiHandler : _ui_,
    kidsOpt   : {
      active : 0
    },
    kids      : [
      Skeletons.Note({
        className : `${menuFig}__note menu-item`,
        content   : LOCALE.ITS_CONNECTION_LOG//CONNECTION_LOG
      })
    ]
  });

  const security = Skeletons.Box.X({
    className : `${menuFig}__item`,
    service   : 'security',
    uiHandler : _ui_,
    kidsOpt   : {
      active : 0
    },
    kids      : [
      Skeletons.Note({
        className : `${menuFig}__note menu-item`,
        content   : LOCALE.SECURITY_OF_THIS_ACCOUNT//SECURITY
      })
    ]
  });

  const seeDesktop = Skeletons.Box.X({
    className : `${menuFig}__item`,
    service   : 'see-desktop',
    uiHandler : _ui_,
    kidsOpt   : {
      active : 0
    },
    kids      : [
      Skeletons.Note({
        className : `${menuFig}__note menu-item`,
        content   : LOCALE.SEE_DESKTOP
      })
    ]
  });

  const resetPassword = Skeletons.Box.X({
    className : `${menuFig}__item`,
    service   : 'reset-member-password',
    uiHandler : _ui_,
    kidsOpt   : {
      active : 0
    },
    kids      : [
      Skeletons.Note({
        className : `${menuFig}__note menu-item`,
        content   : LOCALE.RESET_PASSWORD//'Reset password'
      })
    ]
  });

  const changePassword = Skeletons.Box.X({
    className : `${menuFig}__item`,
    service   : 'change-member-password',
    uiHandler : _ui_,
    kidsOpt   : {
      active : 0
    },
    kids      : [
      Skeletons.Note({
        className : `${menuFig}__note menu-item`,
        content   : LOCALE.AD_CHANGE_PASSWORD//'Reset password'
      })
    ]
  });

  if (data.status != _a.archived) {
    blockUnblockLabel = LOCALE.BLOCK_MEMBER
    if (data.status == _a.locked)
      blockUnblockLabel = LOCALE.UNBLOCK_MEMBER

    blockUnblockMember = Skeletons.Box.X({
      className   : `${menuFig}__item`,
      service     : 'block-unblock-member',
      uiHandler   : _ui_,
      kidsOpt     : {
        active  : 0
      },
      kids        : [
        Skeletons.Note({
          className : `${menuFig}__note menu-item`,
          content   : blockUnblockLabel
        })
      ]
    });
  }

  if ((data.status == _a.locked) || (data.status == _a.archived)) {
    archiveLabel = LOCALE.ARCHIVE_MEMBER//'Archive member'
    if (data.status == _a.archived) {
      archiveLabel = LOCALE.UNARCHIVE_MEMBER//'Unarchive member'
    }
    toggleArchiveMember = Skeletons.Box.X({
      className : `${menuFig}__item`,
      service   : 'toggle-archive-member',
      uiHandler : _ui_,
      kidsOpt   : {
        active : 0
      },
      kids      : [
        Skeletons.Note({
          className : `${menuFig}__note menu-item`,
          content   : archiveLabel
        })
      ]
    });
  }

  menuKids.push(modifyData)
  if (Visitor.domainCan(_K.permission.admin_security) && (Visitor.id != data.drumate_id)) {
    if (data.status != _a.archived) {
      menuKids.push(whoCanSee);
    }
    menuKids.push(connectionLog)
    menuKids.push(security)
    menuKids.push(resetPassword)
    menuKids.push(changePassword)
    menuKids.push(blockUnblockMember)
  }

  if (Visitor.domainCan(_K.permission.admin_member) && (Visitor.id != data.drumate_id)) {
    menuKids.push(toggleArchiveMember)
  }
  
  if (Visitor.id == data.drumate_id) {
    menuKids.push(whoCanSee)
    menuKids.push(connectionLog)
    menuKids.push(security)
  }

  if ((data.status == _a.locked) || (data.status == _a.archived)) {
    menuKids = []
    menuKids.push(whoCanSee)
    menuKids.push(connectionLog)
    // menuKids.push(seeDesktop)
    menuKids.push(blockUnblockMember)
    menuKids.push(toggleArchiveMember)
  }

  const menuItems = Skeletons.Box.X({
    className : `${menuFig}__items-wrapper`,
    kids      : [
      Skeletons.Box.Y({
        className : `${menuFig}__item-wrapper`,
        kids      : menuKids
      })
    ]
  });

  const menu = Skeletons.Box.X({
    debug     : __filename,
    className : `${menuFig}__dropdown ${_ui_.fig.group}__dropdown`,
    kids      : [{
      kind        : KIND.menu.topic,
      className   : `${menuFig}__wrapper ${_ui_.fig.group}__wrapper`,
      flow        : _a.y,
      opening     : _e.click,
      sys_pn      : 'member-action-dropdown',
      service     : 'member-action-menu',
      persistence : _a.none,
      trigger     : menuTrigger,
      items       : menuItems,
      offsetY     : 20
    }]
  });

  return menu;
};


export default __skl_member_room_action_menu;