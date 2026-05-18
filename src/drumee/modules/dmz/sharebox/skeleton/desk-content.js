// ==================================================================== *
//   Copyright Xialia.com  2011-2021
//   FILE : /src/drumee/modules/dmz/sharebox/skeleton/desk-content.js
//   TYPE : Skeleton
// ==================================================================== *

const {
  windowHeader,
  dialog,
  tooltips,
  tabBar,
  chatPanel,
  visioMenu,
  getAreaLabel,
} = require("../../../../builtins/window/skeleton/toolkit/index");

function dmzTopbar(ui) {
  const cnWindowButton = `${ui.fig.group}-button`;
  const cnTopbarTitle = `${ui.fig.group}-topbar-title`;
  const figname = "topbar";
  const area = ui.mget(_a.area);
  const name = ui.mget(_a.title) || ui.mget(_a.filename) || ui.mget(_a.name) || "";
  const canUpload = ui.havePermission(_K.permission.upload, ui.mget(_a.privilege));
  const canEdit = ui.havePermission(_K.permission.write, ui.mget(_a.privilege));

  const titleWrapper = Skeletons.Box.X({
    className: `${cnTopbarTitle}__wrapper`,
    kids: [
      require("../../../../builtins/window/skeleton/topbar/folder-icon")(area),
      Skeletons.Note({
        sys_pn: "ref-window-name",
        className: _a.name,
        content: name,
      }),
      Skeletons.Box.X({
        className: `${ui.fig.family}__badge`,
        kids: [
          Skeletons.Note({
            content: getAreaLabel(area) || LOCALE.SHARED || "Shared",
          }),
        ],
      }),
    ],
  });

  const settingsBtn = Skeletons.Button.Svg({
    ico:
     "setting",
    className: `${cnWindowButton}__icon-button`,
    service: "show-settings",
    uiHandler: ui,
    partHandler: ui,
    sys_pn: "ref-window-icon",
  });

  const buttons = Skeletons.Box.X({
    className: `${cnWindowButton}__buttons-wrapper`,
    kids: [
      // visioMenu(ui),
      // "Add new" in DMZ creates a sub-folder (media.make_dir) — a plain
      // button, not a dropdown: __dmz_wm only supports folders here, and a
      // direct-service button routes reliably to __dmz_wm.onUiEvent (a
      // menu_topic item does not deliver its service through the bubble
      // chain). Shown only to guests whose role grants write permission.
      canEdit
        ? Skeletons.Button.Label({
            className: `${cnWindowButton}__label-button secondary`,
            label: LOCALE.ADD_NEW || "Add new",
            ico: "editbox_list-plus",
            service: "add-folder",
            uiHandler: ui,
          })
        : null,
      canUpload
        ? Skeletons.Button.Label({
            className: `${cnWindowButton}__label-button`,
            label: LOCALE.UPLOAD,
            ico: "desktop_upload",
            service: _e.upload,
            uiHandler: ui,
          })
        : null,
      settingsBtn,
    ],
  });

  return Skeletons.Box.X({
    className: `${ui.fig.group}-${figname}__container ${area || ""}`,
    sys_pn: _a.topBar,
    service: _e.raise,
    debug: __filename,
    kids: [
      Skeletons.Box.X({
        className: `${ui.fig.group}-${figname}__title`,
        kids: [titleWrapper, buttons],
      }),
      Skeletons.Wrapper.Y({
        className: `${ui.fig.group}__wrapper--context dialog__wrapper--context`,
        name: "context",
        uiHandler: ui,
        partHandler: ui,
      }),
    ],
  });
}

function dmzSplitBody(ui) {
  let privilege = ui.mget(_a.privilege);
  if (privilege > _K.privilege.write) privilege = _K.privilege.write;

  let api = null;
  if (ui.nodeInfoService === SERVICE.media.show_node_by) {
    api = {
      service: ui.nodeInfoService,
      nid: ui.mget(_a.nid),
      share_id: ui.mget(_a.share_id),
      recipient_id: ui.mget(_a.user_id),
      page: 1,
    };
  }

  const filesPanel = Skeletons.Box.Y({
    className: `${ui.fig.family}__files-panel ${ui.fig.group}__files-panel`,
    sys_pn: "files-panel",
    kids: [
      {
        kind: "dmz_window_manager",
        className: `${ui.fig.family} desk-content`,
        sys_pn: "desk-content",
        origin: _a.dmz,
        desk: ui,
        uiHandler: ui,
        hub_id: ui.mget(_a.hub_id),
        home_id: ui.mget(_a.home_id),
        nid: ui.mget(_a.nid),
        token: ui.mget(_a.token),
        privilege,
        api,
      },
    ],
  });

  return Skeletons.Box.G({
    className: `${ui.fig.family}__split-body ${ui.fig.group}__split-body`,
    sys_pn: "folder-view",
    partHandler: ui,
    dataset: { view: "files" },
    kids: [filesPanel],
  });
}

function __skl_dmz_sharebox_desk_content(_ui_) {
  const topbar = dmzTopbar(_ui_);

  return Skeletons.Box.Y({
    className: `${_ui_.fig.family}__main ${_ui_.fig.group}__main drive-popup`,
    radio: _a.parent,
    debug: __filename,
    kids: [
      windowHeader(_ui_, topbar),
      tabBar(_ui_),
      dmzSplitBody(_ui_),
      dialog(_ui_),
      tooltips(_ui_),
      Skeletons.FileSelector({
        partHandler: _ui_,
      }),
    ],
  });
}

export default __skl_dmz_sharebox_desk_content;
