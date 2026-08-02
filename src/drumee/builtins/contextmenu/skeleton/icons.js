
const __icon = function (_ui_) {
  const a = {
    account: "desktop_account--white",
    addNew: "topbar-add",
    background: "desktop_picture",
    copy: "desktop_copy",
    createWorkspace: "addmenu-folder",
    delete: "ctxmenu-delete",
    duplicate: "file-copy",
    designationLink: "ctxmenu-designation-link",
    directUrl: "backoffice_public",
    download: "ctxmenu-download",
    edit: "ctxmenu-edit",
    execute: "code-js",
    exitFullScreen: "desktop_reduce",
    export: "server-export",
    exportHidden: "server-export",
    fullscreen: "player-fullscreen",
    helpdesk: "desktop_questionmark",
    import: "server-import",
    importHidden: "server-import",
    info: "ctxmenu-info",
    inviteMember: "topbar-invite",
    link: "editbox_link",
    lock: "protected-lock",
    makeACopy: "ctxmenu-copy",
    modify: "editbox_pencil",
    newFolder: "ctxmenu-new-folder",
    organize: "ctxmenu-organize",
    openFileLocation: "desktop_drumeefolders",
    openInWindow: "ctxmenu-open-window",
    paste: "desktop_paste",
    pinOn: "drumee-tools_pin",
    preferences: "user-settings",
    print: "print",
    properties: "info",
    qrcode: "ctxmenu-qrcode",
    seeChatThreads: "ctxmenu-chat-thread",
    remove: "ctxmenu-delete",
    rename: "ctxmenu-rename",
    rotate: "desktop_rotate",
    rotateLeft: "desktop_rotate",
    rotateRight: "desktop_rotate",
    seo_index: "lens",
    setAsHomepage: "desktop_public",
    settings: "editbox_cog",
    share: "ctxmenu-share",
    secureShare: "ctxmenu-share",
    share_qrcode: "ctxmenu-qrcode",
    shortcut: "editbox_link",
    showHidden: "eye",
    trash: "ctxmenu-delete",
    unlock: "protected-unlock",
    update: "editbox_pencil",
    upload: "desktop_upload",
  };
  if (localStorage.getItem("showHidden")) {
    a.showHidden = "backoffice_preview";
  } else {
    a.showHidden = "eye";
  }
  return a;
};

module.exports = __icon;
