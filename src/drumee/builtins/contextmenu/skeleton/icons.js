// ============================================================== *
//   Copyright Xialia.com  2011-2021
//   FILE : src/drumee/builtins/desk/skeleton/common/topbar/settings
//   TYPE : Skeleton
// ============================================================== *

const __icon = function (_ui_) {
  const a = {
    account: 'desktop_account--white',
    background: 'desktop_picture',
    copy: 'desktop_copy',
    delete: 'desktop_delete',
    directUrl: 'backoffice_public',
    download: 'desktop_download',
    execute: 'code-js',
    exitFullScreen: 'desktop_reduce',
    export: 'server-export',
    exportHidden: 'server-export',
    fullscreen: 'player-fullscreen',
    helpdesk: 'desktop_questionmark',
    import: 'server-import',
    importHidden: 'server-import',
    link: 'editbox_link',
    lock: 'protected-lock',
    modify: 'editbox_pencil',
    newFolder: 'raw-drumee-folder-blue',
    openFileLocation: 'desktop_drumeefolders',
    paste: 'desktop_paste',
    pinOn: 'drumee-tools_pin',
    preferences: 'user-settings',
    properties: 'info',
    remove: 'drumee-trash',
    rename: 'desktop_sharebox_edit',
    rotateLeft: 'desktop_rotate',
    rotateRight: 'desktop_rotate',
    seo_index: 'lens',
    setAsHomepage: 'desktop_public',
    settings: 'editbox_cog',
    share_qrcode: 'editbox_link',
    shortcut: 'editbox_link',
    showHidden: 'eye',
    unlock: 'protected-unlock',
    update: 'editbox_pencil',
    upload: 'desktop_upload'
  };
  if (localStorage.getItem("showHidden")) {
    a.showHidden = 'backoffice_preview';
  } else {
    a.showHidden = 'eye';
  }
  return a;
};

module.exports = __icon;