// ==================================================================== *
//   Copyright Xialia.com  2011-2021
//   FILE : src/drumee/builtins/desk/skeleton/common/topbar/settings
//   TYPE : Skeleton
// ==================================================================== *

const __button = function(_ui_, trigger, k){
  const pfx = `${_ui_.fig.group}__contextmenu-item contextmenu-item`;
  let button = Skeletons.Button.Label;
  const icon = {...require('./icons')(_ui_), ...require('./icons.electron')(_ui_)};

  const cn = {...require('./classes')(_ui_), ...require('./classes.electron')(_ui_)};


  let canPaste = _a.disable;
  if (window.Wm && !_.isEmpty(window.Wm.clipboard.files)) {
    canPaste = _a.open;
  }
  
  //console.log('AAA:59', k, icon[k], icon);

  if (!icon[k]) {
    button = Skeletons.Note;
  }

  let a = { 
    account:button({label:LOCALE.MY_ACCOUNT, service: _a.account}),
    background: button({label: LOCALE.SET_AS_BACKGROUND , service: 'set-as-background'}),
    copy:button({label:LOCALE.COPY, service: _e.copy}),
    delete: button({label: LOCALE.DELETE, service: _e.delete}),
    deleteMeeting: button({label: LOCALE.DELETE_MEETING, service: 'delete-meeting'}),
    deletePermanently: button({label:LOCALE.DELETE_PERMENANTLY, service: 'delete-permanently'}),
    directUrl:button({label:LOCALE.URL_ADDRESS, service: 'direct-url'}),
    download:button({label:LOCALE.DOWNLOAD, service: _e.download}),
    exitFullScreen: button({label: LOCALE.EXIT_FULLSCREEN, service: 'toggle-fullscreen'}),
    execute: button({label: LOCALE.EXCUTE, service: 'load-script'}),
    export: button({label: LOCALE.EXPORT_TO_SERVER, service: 'export-to-server', type: _a.export}),
    exportHidden: button({label: LOCALE.EXPORT_TO_SERVER, service: _a.none, type: _a.export, dataset: {state: _a.disable}}),
    fullscreen: button({label: LOCALE.FULLSCREEN, service: 'toggle-fullscreen'}),
    helpdesk: button({label:LOCALE.HELPDESK, service: _a.helpdesk}),
    import: button({label: LOCALE.IMPORT_FROM_SERVER, service: 'import-from-server', type: _a.import}),
    importHidden: button({label: LOCALE.IMPORT_FROM_SERVER, service: _a.none, type: _a.import, dataset: {state: _a.disable}}),
    link: button({label:LOCALE.SHARE_LINK, service:_a.link}),
    lock:button({label:LOCALE.PROTECTED, service: _e.lock}),
    meetingLink: button({label: LOCALE.COPY_MEETING_LINK, service: 'copy-meeting-link'}),
    modify:button({label:LOCALE.MODIFY, service: _a.modify}),
    newFolder:button({label:LOCALE.NEW_FOLDER, service: 'new-folder'}),
    openFileLocation: button({label: LOCALE.OPEN_FILE_LOCATION, service: 'open-file-location'}),
    paste: button({label:LOCALE.PASTE, service: _e.paste, dataset: {state: canPaste}}),
    pinOn: button({label:LOCALE.PIN_ON, service: 'pin-on'}),
    preferences: button({label:LOCALE.PREFERENCES, service: _a.preferences}),
    properties:button({label:LOCALE.SHOW_PROPERTIES, service: _a.properties}),
    qrcode:button({label:LOCALE.SHOW_QRCODE, service: "show-qrcode"}),
    remove:button({label:LOCALE.REMOVE, service: _e.remove}),
    rename: button({label:LOCALE.RENAME, service: 'direct-rename'}),
    restoreToDesk: button({label: LOCALE.RESTORE_TO_DESK, service: 'restore-to-desk'}),
    rotateLeft: button({label:LOCALE.ROTATE_LEFT, service: _e.rotate, value:-90}),
    rotateRight: button({label:LOCALE.ROTATE_RIGHT, service: _e.rotate, value:90}),
    seo_index: button({label:LOCALE.CREATE_SEO_INDEX, service: 'seo-index'}),
    separator: Skeletons.Element({className: 'separator'}),
    setAsHomepage: button({label: LOCALE.SET_AS_HOMEPAGE, service: 'set-as-homepage'}),
    settings: button({label:LOCALE.SETTINGS, service: _e.settings}),
    share_qrcode:button({label:LOCALE.SHOW_QRCODE, service: "share-qrcode"}),
    shortcut:button({label:LOCALE.CREATE_SHORTCUT, service: _a.shortcut}),
    startMeeting: button({label: LOCALE.START_MEETING , service: 'start-meeting'}),
    unlock:button({label:LOCALE.UNPROTECTED, service: _e.lock}),
    update:button({label:LOCALE.UPDATE, service: _e.update}),
    upload:button({label:LOCALE.UPLOAD, service: _e.upload})
  };
  if(localStorage.getItem("showHidden")){
    a.showHidden = button({label: LOCALE.HIDE_HIDDEN_FILES, service: 'hide-hidden-files'});
  }else{
    a.showHidden = button({label: LOCALE.SHOW_HIDDEN_FILES, service: 'show-hidden-files'});
  }

  if(a[k]) {
    const r = a[k]; 
    r.className = `${pfx}`;
    r.uiHandler = [_ui_];
    if (cn[k]) { 
      r.className = `${pfx} ${cn[k]}`;
    }
    if (icon[k]) { 
      r.chartId = icon[k];
    }
    return r; 
  }
  return null; 
};

module.exports = __button;