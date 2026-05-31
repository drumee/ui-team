/* ==================================================================== *
 * Folder window topbar — mirrors Figma node 272:49250
 * "Window Header (Purple Accent)".
 *
 * Layout (single row, justify-content: space-between, padded 0 21.9px,
 * background Grey/30 #E5E5EA):
 *
 *   [ folder-icon ][ "Folder" + area-badge ]            [ 🔍 ][ Upload ][ + Add new ][ × ]
 *   ↑ left cluster                                      ↑ right cluster (gap 13.14)
 * ==================================================================== */

const { getAreaLabel, newFileMenu, zoomMenu } = require("../../skeleton/toolkit");

const __skl_folder_topbar = function (ui) {
  const cnFolder = `${ui.fig.family}-topbar`;
  const cnGroup = `${ui.fig.group}-topbar`;
  const area = ui.mget(_a.area);
  // Root nodes have an empty filename; the workspace name lives in hub_name.
  // Fall back to it so the topbar title isn't blank at a workspace root.
  const filename = ui.mget(_a.filename) || ui.mget(_a.name) || ui.model.get("hub_name") || "";

  // ── Left cluster ─────────────────────────────────────────────
  const logo = Skeletons.Image.Svg({
    ico: "folder-header",
    className: `${cnFolder}__logo`,
    dataset: { area },
  });

  const title = Skeletons.Note({
    className: `${cnFolder}__title`,
    sys_pn: "ref-window-name",
    content: filename,
  });

  const breadcrumbPath = Skeletons.Box.X({
    className: `${cnFolder}__breadcrumb-path`,
    sys_pn: "folder-breadcrumb-path",
    partHandler: ui,
    dataset: { state: 0 },
  });

  const badgeLabel = getAreaLabel(area);
  const badge =
    area && badgeLabel
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
    kids: [breadcrumbPath, title, badge],
  });

  const leftCluster = Skeletons.Box.X({
    className: `${cnFolder}__left`,
    kids: [logo, heading],
  });

  // ── Right cluster ────────────────────────────────────────────
  const canUpload = ui.canUpload && ui.canUpload();

  const videoBtn = Skeletons.Button.Svg({
    className: `${cnFolder}__video-btn`,
    ico: "video-camera-header",
    service: "tab-meeting",
    uiHandler: ui,
  });

  let uploadBtn = canUpload
    ? Skeletons.Button.Label({
      className: `${cnFolder}__upload-btn`,
      label: LOCALE.UPLOAD,
      ico: "desktop_upload",
      service: _e.upload,
      uiHandler: ui,
    })
    : "";

  let addNew = canUpload
    ? Skeletons.Box.X({
      className: `${cnFolder}__add-new-wrapper`,
      kids: [newFileMenu(ui, { triggerIco: "plus-header" })],
    })
    : "";

  // Share-area folders get a dedicated "Manage Access" icon next to the
  // settings gear; other folder types do not show it.
  const shareBtn =
    area === _a.share
      ? Skeletons.Button.Svg({
        className: `${cnFolder}__control-icon share`,
        ico: "share",
        service: "folder-manage-access",
        uiHandler: ui,
      })
      : "";

  const settingsBtn = Skeletons.Button.Svg({
    className: `${cnFolder}__control-icon settings`,
    ico: "gear-header",
    service: _e.settings,
    uiHandler: ui,
  });

  // File view toggle. A single control that shows the CURRENT view's glyph:
  // the list icon (3 bars) in row mode, the grid icon (2x2) otherwise. Both
  // glyphs are rendered; CSS reveals only the one matching the control's
  // data-state. toggleFilesLayout() flips that state via cmd.changeState(), so
  // the glyph swaps with no extra JS. active:0 on the glyphs lets the click
  // bubble to the box's "toggle-files-layout" service.
  const splitBtn = Skeletons.Box.X({
    className: `${cnFolder}__control-icon`,
    service: "toggle-files-layout",
    sys_pn: "view-ctrl",
    // Explicit data-state (not the `state` prop) guarantees the attribute is
    // present on first render so the correct glyph shows immediately; the
    // grid glyph is the CSS default, so only row/list (state 1) needs it.
    dataset: { state: ui.getViewMode && ui.getViewMode() === _a.row ? 1 : 0 },
    uiHandler: [ui],
    kidsOpt: { active: 0 },
    kids: [
      Skeletons.Image.Svg({
        ico: "view-list",
        className: `${cnFolder}__control-icon-glyph ${cnFolder}__control-icon-glyph--list`,
      }),
      Skeletons.Image.Svg({
        ico: "view-grid",
        className: `${cnFolder}__control-icon-glyph ${cnFolder}__control-icon-glyph--grid`,
      }),
    ],
  });

  let controls = require("window/skeleton/topbar/control")(ui, "mc");

  const rightCluster = Skeletons.Box.X({
    className: `${cnFolder}__right`,
    kids: [videoBtn, uploadBtn, addNew, shareBtn, settingsBtn, splitBtn, zoomMenu(ui), controls],
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
