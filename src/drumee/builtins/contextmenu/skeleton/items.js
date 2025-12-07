
const __button = function (ui, trigger, k) {
  const pfx = `${ui.fig.group}__contextmenu-item contextmenu-item`;
  // let button = Skeletons.Button.content;
  // const icon = require('./icons')(ui);

  const cn = require('./classes')(ui);


  let canPaste = _a.disable;
  if (window.Wm && !_.isEmpty(window.Wm.clipboard.files)) {
    canPaste = _a.open;
  }


  let button = Skeletons.Note;

  let a = {
    account: button({ content: LOCALE.MY_ACCOUNT, service: _a.account }),
    background: button({ content: LOCALE.SET_AS_BACKGROUND, service: 'set-as-background' }),
    copy: button({ content: LOCALE.COPY, service: _e.copy }),
    delete: button({ content: LOCALE.DELETE, service: _e.delete }),
    deleteMeeting: button({ content: LOCALE.DELETE_MEETING, service: 'delete-meeting' }),
    deletePermanently: button({ content: LOCALE.DELETE_PERMENANTLY, service: 'delete-permanently' }),
    directUrl: button({ content: LOCALE.URL_ADDRESS, service: 'direct-url' }),
    download: button({ content: LOCALE.DOWNLOAD, service: _e.download }),
    duplicate: button({ content: LOCALE.DUPLICATE, service: _a.duplicate }),
    execute: button({ content: LOCALE.EXCUTE, service: 'load-script' }),
    exitFullScreen: button({ content: LOCALE.EXIT_FULLSCREEN, service: 'toggle-fullscreen' }),
    export: button({ content: LOCALE.EXPORT_TO_SERVER, service: 'export-to-server', type: _a.export }),
    exportHidden: button({ content: LOCALE.EXPORT_TO_SERVER, service: _a.none, type: _a.export, dataset: { state: _a.disable } }),
    fullscreen: button({ content: LOCALE.FULLSCREEN, service: 'toggle-fullscreen' }),
    helpdesk: button({ content: LOCALE.HELPDESK, service: _a.helpdesk }),
    import: button({ content: LOCALE.IMPORT_FROM_SERVER, service: 'import-from-server', type: _a.import }),
    importHidden: button({ content: LOCALE.IMPORT_FROM_SERVER, service: _a.none, type: _a.import, dataset: { state: _a.disable } }),
    info: button({ content: LOCALE.GET_INFO, service: _e.settings, type: _a.info }),
    link: button({ content: LOCALE.SHARE_LINK, service: _a.link }),
    lock: button({ content: LOCALE.PROHIBIT_CHANGE, service: _e.lock }),
    meetingLink: button({ content: LOCALE.COPY_MEETING_LINK, service: 'copy-meeting-link' }),
    modify: button({ content: LOCALE.MODIFY, service: _a.modify }),
    newFolder: button({ content: LOCALE.NEW_FOLDER, service: 'new-folder' }),
    openFileLocation: button({ content: LOCALE.OPEN_FILE_LOCATION, service: 'open-file-location' }),
    paste: button({ content: LOCALE.PASTE, service: _e.paste, dataset: { state: canPaste } }),
    pinOn: button({ content: LOCALE.PIN_ON, service: 'pin-on' }),
    preferences: button({ content: LOCALE.PREFERENCES, service: _a.preferences }),
    properties: button({ content: LOCALE.SHOW_PROPERTIES, service: _a.properties }),
    qrcode: button({ content: LOCALE.SHOW_QRCODE, service: "show-qrcode" }),
    remove: button({ content: LOCALE.REMOVE, service: _e.remove }),
    rename: button({ content: LOCALE.RENAME, service: 'direct-rename' }),
    restoreToDesk: button({ content: LOCALE.RESTORE_TO_DESK, service: 'restore-to-desk' }),
    rotateLeft: button({ content: LOCALE.ROTATE_LEFT, service: _e.rotate, value: -90 }),
    rotateRight: button({ content: LOCALE.ROTATE_RIGHT, service: _e.rotate, value: 90 }),
    seo_index: button({ content: LOCALE.CREATE_SEO_INDEX, service: 'seo-index' }),
    separator: Skeletons.Element({ className: 'separator' }),
    setAsHomepage: button({ content: LOCALE.SET_AS_HOMEPAGE, service: 'set-as-homepage' }),
    settings: button({ content: LOCALE.SETTINGS, service: _e.settings }),
    share_qrcode: button({ content: LOCALE.SHOW_QRCODE, service: "share-qrcode" }),
    shortcut: button({ content: LOCALE.CREATE_SHORTCUT, service: _a.shortcut }),
    startMeeting: button({ content: LOCALE.START_MEETING, service: 'start-meeting' }),
    pricing: button({ content: "Pricing", service: "pricing" }),
    trash: button({ content: LOCALE.MOVE_TO_TRASH, service: _e.remove }),
    unlock: button({ content: LOCALE.UNPROTECTED, service: _e.lock }),
    update: button({ content: LOCALE.UPDATE, service: _e.update }),
    upload: button({ content: LOCALE.UPLOAD, service: _e.upload })
  };
  if (localStorage.getItem("showHidden")) {
    a.showHidden = button({ content: LOCALE.HIDE_HIDDEN_FILES, service: 'hide-hidden-files' });
  } else {
    a.showHidden = button({ content: LOCALE.SHOW_HIDDEN_FILES, service: 'show-hidden-files' });
  }

  if (a[k]) {
    const r = a[k];
    r.className = `${pfx}`;
    r.uiHandler = [ui];
    if (cn[k]) {
      r.className = `${pfx} ${cn[k]}`;
    }
    // if (icon[k]) {
    //   r.chartId = icon[k];
    // }
    return r;
  }
  return null;
};

module.exports = __button;