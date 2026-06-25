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

const { getAreaLabel, newFileMenu, zoomMenu, topbarMoreMenu } = require("../../skeleton/toolkit");

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
  // Secure-share recipient context: a folder window opened from a share carries the
  // pinned share token (dmz/wm getWindowPreset). Such a window is a restricted VIEWER —
  // owner/member chrome (call, Manage Access, settings) must NOT appear, at any nesting
  // depth. A normal desk folder has no share token → full chrome (unchanged). Upload/
  // Add-new are already gated on canUpload, which a capped recipient lacks.
  const inShare = !!ui.mget(_a.token);

  const videoBtn = inShare ? "" : Skeletons.Button.Svg({
    className: `${cnFolder}__video-btn`,
    ico: "video-camera-header",
    service: "tab-meeting",
    uiHandler: ui,
  });

  let uploadBtn = canUpload
    ? Skeletons.Button.Label({
      className: `${cnFolder}__upload-btn`,
      label: LOCALE.UPLOAD,
      ico: "app-upload",
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
    (!inShare && area === _a.share)
      ? Skeletons.Button.Svg({
        className: `${cnFolder}__control-icon share`,
        ico: "app-share",
        service: "folder-manage-access",
        uiHandler: ui,
      })
      : "";

  const settingsBtn = inShare ? "" : Skeletons.Button.Svg({
    className: `${cnFolder}__control-icon settings`,
    ico: "gear-header",
    service: _e.settings,
    uiHandler: ui,
  });

  // Headless = the full-area workspace pane (sidebar-driven), not a popup, so
  // it drops the minimize/zoom chrome but still keeps a close (×) button so the
  // window can be dismissed.
  const headless = ui.mget(_a.headless);

  let controls = require("window/skeleton/topbar/control")(ui, "c");

  // Custom minimize glyph (Unicode U+2212) — thinner than the bundled
  // `window-minimize` SVG which renders as a heavy 1.6/14 vh bar.
  const minimizeBtn = headless
    ? ""
    : Skeletons.Note({
        className: `${cnFolder}__minimize-btn`,
        content: "−",
        service: _e.minimize,
        uiHandler: [ui],
      });

  const zoomBtn = headless ? "" : zoomMenu(ui);

  // Overflow menu for the narrow (≤700px container) layout. Holds the same
  // actions as videoBtn / shareBtn / settingsBtn; CSS swaps it in for those
  // inline buttons by window width. Always in the DOM (hidden on desktop).
  const moreMenu = topbarMoreMenu(ui);

  const rightCluster = Skeletons.Box.X({
    className: `${cnFolder}__right`,
    kids: [videoBtn, uploadBtn, addNew, shareBtn, settingsBtn, moreMenu, zoomBtn, minimizeBtn, controls],
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
