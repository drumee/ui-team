
const __button = function (ui, trigger, k) {
  const pfx = `${ui.fig.group}__contextmenu-item contextmenu-item`;
  const icons = require('./icons')();
  const cn = require('./classes')(ui);

  let canPaste = _a.disable;
  if (window.Wm && !_.isEmpty(window.Wm.clipboard.files)) {
    canPaste = _a.open;
  }

  const item = (service, content, extra = {}) => Skeletons.Box.X({
    service,
    ...extra,
    kids: [
      Skeletons.Button.Svg({ ico: icons[k], className: 'contextmenu-item__icon' }),
      Skeletons.Note({ content, className: 'contextmenu-item__label' }),
    ],
  });

  let a = {
    account: item(_a.account, LOCALE.MY_ACCOUNT),
    background: item('set-as-background', LOCALE.SET_AS_BACKGROUND),
    chat: item(_a.chat, LOCALE.CHAT),
    copy: item(_e.copy, LOCALE.COPY),
    delete: item(_e.delete, LOCALE.DELETE),
    deleteMeeting: item('delete-meeting', LOCALE.DELETE_MEETING),
    deletePermanently: item('delete-permanently', LOCALE.DELETE_PERMENANTLY),
    directUrl: item('direct-url', LOCALE.URL_ADDRESS),
    download: item(_e.download, LOCALE.DOWNLOAD),
    duplicate: item(_a.duplicate, LOCALE.DUPLICATE),
    edit: item('open-node', LOCALE.EDIT, { mode: _a.edit }),
    execute: item('load-script', LOCALE.EXCUTE),
    exitFullScreen: item('toggle-fullscreen', LOCALE.EXIT_FULLSCREEN),
    export: item('export-to-server', LOCALE.EXPORT_TO_SERVER, { type: _a.export }),
    exportHidden: item(_a.none, LOCALE.EXPORT_TO_SERVER, { type: _a.export, dataset: { state: _a.disable } }),
    fullscreen: item('toggle-fullscreen', LOCALE.FULLSCREEN),
    helpdesk: item(_a.helpdesk, LOCALE.HELPDESK),
    import: item('import-from-server', LOCALE.IMPORT_FROM_SERVER, { type: _a.import }),
    importHidden: item(_a.none, LOCALE.IMPORT_FROM_SERVER, { type: _a.import, dataset: { state: _a.disable } }),
    info: item(_e.settings, LOCALE.GET_INFO, { type: _a.info }),
    link: item(_a.link, LOCALE.SHARE_LINK),
    linkToTaskTracker: item('link-to-task-tracker', LOCALE.LINK_TO_TASK_TRACKER),
    lock: item(_e.lock, LOCALE.PROHIBIT_CHANGE),
    makeACopy: item(_a.duplicate, LOCALE.MAKE_A_COPY),
    manageAccess: item('manage-access', LOCALE.SHARE),
    meetingLink: item('copy-meeting-link', LOCALE.COPY_MEETING_LINK),
    modify: item(_a.modify, LOCALE.MODIFY),
    move: item('move', LOCALE.MOVE),
    newFolder: item('new-folder', LOCALE.NEW_FOLDER),
    openFileLocation: item('open-file-location', LOCALE.OPEN_FILE_LOCATION),
    organize: item('organize', LOCALE.ORGANIZE),
    paste: item(_e.paste, LOCALE.PASTE, { dataset: { state: canPaste } }),
    pinOn: item('pin-on', LOCALE.PIN_ON),
    preferences: item(_a.preferences, LOCALE.PREFERENCES),
    properties: item(_a.properties, LOCALE.SHOW_PROPERTIES),
    qrcode: item('show-qrcode', LOCALE.SHOW_QRCODE),
    remove: item(_e.remove, LOCALE.REMOVE),
    rename: item('direct-rename', LOCALE.RENAME),
    restoreToDesk: item('restore-to-desk', LOCALE.RESTORE_TO_DESK),
    rotateLeft: item(_e.rotate, LOCALE.ROTATE_LEFT, { value: -90 }),
    rotateRight: item(_e.rotate, LOCALE.ROTATE_RIGHT, { value: 90 }),
    seo_index: item('seo-index', LOCALE.CREATE_SEO_INDEX),
    separator: Skeletons.Element({ className: 'separator' }),
    setAsHomepage: item('set-as-homepage', LOCALE.SET_AS_HOMEPAGE),
    settings: item(_e.settings, LOCALE.SETTINGS),
    share: item(_a.share, LOCALE.SHARE),
    share_qrcode: item('share-qrcode', LOCALE.SHOW_QRCODE),
    shortcut: item(_a.shortcut, LOCALE.CREATE_SHORTCUT),
    startMeeting: item('start-meeting', LOCALE.START_MEETING),
    pricing: item('pricing', 'Pricing'),
    trash: item(_e.remove, LOCALE.MOVE_TO_TRASH),
    unlock: item(_e.lock, LOCALE.UNPROTECTED),
    update: item(_e.update, LOCALE.UPDATE),
    upload: item(_e.upload, LOCALE.UPLOAD),
  };

  if (localStorage.getItem("showHidden")) {
    a.showHidden = item('hide-hidden-files', LOCALE.HIDE_HIDDEN_FILES);
  } else {
    a.showHidden = item('show-hidden-files', LOCALE.SHOW_HIDDEN_FILES);
  }

  if (a[k]) {
    const r = a[k];
    r.className = `${pfx}`;
    r.uiHandler = [ui];
    if (cn[k]) {
      r.className = `${pfx} ${cn[k]}`;
    }
    return r;
  }
  return null;
};

module.exports = __button;
