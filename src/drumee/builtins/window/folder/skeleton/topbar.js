/* ==================================================================== *
 * Folder window topbar — merged: v2 figma-aligned cluster layout
 * (left: logo+heading+badge; right: search/upload/+add/controls)
 * combined with workspace branch additions (visio menu, settings,
 * view toggle).
 * ==================================================================== */

const { getAreaLabel, newFileMenu, visioMenu } = require("../../skeleton/toolkit");

function viewControl(ui) {
  const state = ui.getViewMode && ui.getViewMode() === _a.row ? 1 : 0;
  return Skeletons.Button.Svg({
    ico: "square-split-horizontal",
    className: `${ui.fig.family}__icon-button`,
    service: "change-view",
    sys_pn: "view-ctrl",
    uiHandler: [ui],
    state,
    icons: ["square-split-horizontal", "square-split-horizontal"],
  });
}

const __skl_folder_topbar = function (ui) {
  const cnFolder = `${ui.fig.family}-topbar`;
  const cnGroup = `${ui.fig.group}-topbar`;
  const area = ui.mget(_a.area);
  const filename = ui.mget(_a.filename) || ui.mget(_a.name) || "";

  // ── Left cluster ─────────────────────────────────────────────
  const logo = require("../../skeleton/logo")(ui);

  const title = Skeletons.Note({
    className: `${cnFolder}__title`,
    sys_pn: "ref-window-name",
    content: filename,
  });

  const badgeLabel = getAreaLabel(area);
  const badge = (area && badgeLabel)
    ? Skeletons.Box.X({
        className: `${cnFolder}__badge`,
        dataset: { area },
        kids: [
          Skeletons.Note({
            className: `${cnFolder}__badge-label`,
            content: badgeLabel,
          }),
        ],
      })
    : "";

  const heading = Skeletons.Box.X({
    className: `${cnFolder}__heading`,
    kids: [title, badge],
  });

  const leftCluster = Skeletons.Box.X({
    className: `${cnFolder}__left`,
    kids: [logo, heading],
  });

  // ── Right cluster ────────────────────────────────────────────
  const canUpload = ui.canUpload && ui.canUpload();

  const searchBtn = Skeletons.Button.Svg({
    className: `${cnFolder}__search-btn`,
    ico: "magnifying-glass",
    service: "open-searchbox",
    uiHandler: [ui],
  });

  const visio = canUpload ? visioMenu(ui, { triggerIco: "video-camera-header" }) : "";

  const uploadBtn = canUpload
    ? Skeletons.Button.Label({
        className: `${cnFolder}__upload-btn`,
        label: LOCALE.UPLOAD,
        ico: "desktop_upload",
        service: _e.upload,
        uiHandler: [ui],
      })
    : "";

  const addNew = canUpload
    ? Skeletons.Box.X({
        className: `${cnFolder}__add-new-wrapper`,
        kids: [newFileMenu(ui, { triggerIco: "plus-header" })],
      })
    : "";

  const settings = (area === _a.personal)
    ? ""
    : Skeletons.Button.Svg({
        ico: "gear-header",
        className: `${cnFolder}__settings-btn`,
        service: _e.settings,
        uiHandler: [ui],
      });

  const view = viewControl(ui);
  const controls = require("window/skeleton/topbar/control")(ui, "c");

  const rightCluster = Skeletons.Box.X({
    className: `${cnFolder}__right`,
    kids: [searchBtn, visio, uploadBtn, addNew, settings, view, controls],
  });

  // ── Root row ─────────────────────────────────────────────────
  return Skeletons.Box.X({
    className: `${cnGroup}__container ${cnFolder}__container`,
    sys_pn: "browser-top-bar",
    debug: __filename,
    service: _e.raise,
    dataset: { area, group: ui.fig.group },
    kids: [
      leftCluster,
      rightCluster,
      Skeletons.Wrapper.Y({
        className: `${ui.fig.family}__wrapper-info`,
        name: "info",
        dataset: { state: _a.closed },
      }),
    ],
  });
};

module.exports = __skl_folder_topbar;
