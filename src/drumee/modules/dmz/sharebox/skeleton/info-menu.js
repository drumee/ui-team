// ================================================================== *
//   Copyright Xialia.com  2011-2021
//   FILE : /src/drumee/modules/dmz/sharebox/skeleton/info-menu.js
//   TYPE : Skeleton
// ===================================================================**/


function __skl_dmz_sharebox_info_menu (_ui_) {

  const menuFig = `${_ui_.fig.family}-menu`;

  let _downloadRightsIcon, _uploadRightsIcon;

  const menuTrigger = Skeletons.Button.Svg({
    ico       : 'info',
    className : `${menuFig}__icon ${menuFig}__trigger trigger-icon account_info`,
    service   : 'info-menu',
    uiHandler : _ui_
  });

  const ownerTitle = Skeletons.Box.X({
    className : `${menuFig}__item title`,
    service   : _e.edit,
    uiHandler : _ui_,
    kidsOpt   : {
      active : 0
    },
    kids      : [
      Skeletons.Note({
        className : `${menuFig}__note menu-item title`,
        content   : LOCALE.DMZ_SHAREBOX_OWNER
      })
    ]
  });

  const ownerName = Skeletons.Box.X({
    className : `${menuFig}__item`,
    kids      : [
      Skeletons.Button.Svg({
        ico       : 'account',
        className : `${menuFig}__icon owner-name`,
      }),

      Skeletons.Note({
        className : `${menuFig}__note menu-item owner-name`,
        content   :  _ui_.mget('sender')
      })
    ]
  });

  const rightsTitle = Skeletons.Box.X({
    className : `${menuFig}__item title`,
    kids      : [
      Skeletons.Note({
        className : `${menuFig}__note menu-item title`,
        content   : LOCALE.DMZ_YOUR_RIGHTS
      })
    ]
  });

  const viewRights = Skeletons.Box.X({
    className : `${menuFig}__item`,
    kids      : [
      Skeletons.Button.Svg({
        ico       : 'available',
        className : `${menuFig}__icon rights account_check`,
      }),
      
      Skeletons.Note({
        className : `${menuFig}__note menu-item rights`,
        content   : LOCALE.VIEW
      })
    ]
  });

  if (_ui_.havePermission(_K.permission.download, _ui_.mget(_a.privilege))) {
    _downloadRightsIcon = 'available'
  } else {
    _downloadRightsIcon = 'cross'
  }

  const downloadRights = Skeletons.Box.X({
    className : `${menuFig}__item`,
    service : _e.download,
    kidsOpt:{
      service : _e.download, 
    },
    kids      : [
      Skeletons.Button.Svg({
        ico       : _downloadRightsIcon,
        className : `${menuFig}__icon rights ${_downloadRightsIcon}`,
      }),

      Skeletons.Note({
        className : `${menuFig}__note menu-item rights`,
        content   : LOCALE.DOWNLOAD
      })
    ]
  });

  if (_ui_.havePermission(_K.permission.upload, _ui_.mget(_a.privilege))) {
    _uploadRightsIcon = 'available'
  } else {
    _uploadRightsIcon = 'cross'
  }

  const uploadRights = Skeletons.Box.X({
    className : `${menuFig}__item`,
    service : _e.upload, 
    kidsOpt:{
      service : _e.upload, 
    },
    kids      : [
      Skeletons.Button.Svg({
        ico       : _uploadRightsIcon,
        className : `${menuFig}__icon rights ${_uploadRightsIcon}`,
      }),

      Skeletons.Note({
        className : `${menuFig}__note menu-item rights`,
        content   : LOCALE.UPLOAD
      })
    ]
  });

  const expiresInTitle = Skeletons.Box.X({
    className : `${menuFig}__item title`,
    kids      : [
      Skeletons.Note({
        className : `${menuFig}__note menu-item title expires-in`,
        content   : LOCALE.EXPIRES_IN//'Expires In'
      })
    ]
  });

  const expiresInDetails = Skeletons.Box.X({
    className : `${menuFig}__item expires-in`,
    kids      : [
      Skeletons.Note({
        className : `${menuFig}__note days expires-in-value`,
        content   : _ui_.mget(_a.days) || '∞'
      }),

      Skeletons.Note({
        className : `${menuFig}__note menu-item days expires-in-label`,
        content   : LOCALE.DAYS
      }),

      Skeletons.Note({
        className : `${menuFig}__note hours expires-in-value`,
        content   : _ui_.mget(_a.hours) || '∞'
      }),

      Skeletons.Note({
        className : `${menuFig}__note menu-item hours expires-in-label`,
        content   : LOCALE.HOURS
      })
    ]
  });

  const menuItems = Skeletons.Box.X({
    className : `${menuFig}__items-wrapper`,
    kids      : [
      Skeletons.Box.Y({
        className : `${menuFig}__item-wrapper`,
        kids      : [
          ownerTitle,
          ownerName,
          rightsTitle,
          viewRights,
          downloadRights,
          uploadRights,
          expiresInTitle,
          expiresInDetails
        ]
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
      persistence : _a.always,
      trigger     : menuTrigger,
      items       : menuItems
    }]
  });

  return menu;
};

export default __skl_dmz_sharebox_info_menu;