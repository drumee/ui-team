// ===========================================================
//  Notion-style Note topbar — the shared player topbar widget, laid out
//  to Lexis's Figma (1406:25557): note glyph + name, then Share, Download,
//  the gear menu, Expand and Close.
// ===========================================================
const Topbar = require("builtins/player/widget/topbar");

/**
 * The gear menu. Export moved here from its own header button: the header
 * Download is the PDF, every other format is one level down.
 * @param {Object} ui
 */
function gearMenu(ui) {
  const row = (value, icon, label) => ({ id: `export-${value}`, label, icon, service: "export-note", value });
  return [
    {
      id: "export-menu",
      label: LOCALE.NOTE_EXPORT,
      icon: "ph-export",
      service: "export-menu",
      children: [
        row("pdf", "ph-file-pdf", LOCALE.EXPORT_AS_PDF),
        row("docx", "ph-file-doc", LOCALE.EXPORT_AS_DOCX),
        row("html", "ph-file-html", LOCALE.EXPORT_AS_HTML),
        row("md", "ph-file-md", LOCALE.EXPORT_AS_MARKDOWN),
        row("csv", "ph-file-csv", LOCALE.EXPORT_AS_CSV),
      ],
    },
    row("print", "ph-printer", LOCALE.PRINT),
  ];
}

/**
 * The Share pill: a lock and the word, on the primary tint.
 * @param {Object} ui
 */
function sharePill(ui) {
  const pfx = `${ui.fig.family}-topbar`;
  return Skeletons.Box.X({
    className: `${pfx}__share`,
    sys_pn: "note-share",
    service: "secure-share",
    uiHandler: [ui],
    kidsOpt: { active: 0 },
    kids: [
      Skeletons.Button.Svg({ ico: "ph-lock-key", className: `${pfx}__share-icon` }),
      Skeletons.Note({ className: `${pfx}__share-label`, content: LOCALE.SHARE }),
    ],
  });
}

function config(ui) {
  const pfx = `${ui.fig.family}-topbar`;
  const icon = (service, ico, tooltips, extra = {}) => ({
    type: "button",
    icon: ico,
    service,
    className: `icon ${pfx}__icon ${extra.className || ""}`.trim(),
    tooltips,
    ...extra,
  });

  let filename = ui.mget(_a.filename);
  if (!filename && ui.media) filename = ui.media.mget(_a.filename);

  const before = [
    {
      // Autosave says nothing while all is well; the line only appears when
      // there is something to know (saving, unsaved, read-only, upgrading).
      type: "custom",
      component: Skeletons.Note({
        sys_pn: "save-status",
        className: `${pfx}__save-status`,
        content: "",
        active: 0,
        dataset: { state: "saved" },
      }),
    },
  ];
  if (ui.canEditNote()) before.push({ type: "custom", component: sharePill(ui) });
  before.push(icon("download-note", "ph-download-simple", LOCALE.DOWNLOAD));

  return {
    left: {
      fileTypeIcon: "raw-ab_notes",
      title: filename || LOCALE.UNTITLED,
    },
    right: {
      before,
      after: [
        icon("note-fullscreen", "ph-arrows-out-simple", LOCALE.FULL_SCREEN, {
          id: "note-fullscreen",
          partHandler: ui,
        }),
        icon(_e.close, "ph-x", LOCALE.CLOSE),
      ],
    },
    defaults: {
      "folder-settings": {
        menu: gearMenu(ui),
        icon: "ph-gear",
        className: `icon gear ${pfx}__icon`,
      },
      // Docked to the workspace: there is no layout to pick, only Expand.
      "move-resize": { visible: false },
      // The widget's close sits before `after`; ours is the last button.
      close: { visible: false },
    },
  };
}

module.exports = function (ui) {
  return Topbar(ui, config(ui));
};
