// Attachments blocks of the Personal Calendar modals: the meeting modal's drop
// zone (default export) and the task modal's Search file + Upload (taskFiles,
// below).
//
// The whole block is the drop zone (data-drop-zone="files"); the controller
// lights it with data-drop-active while a computer file is dragged over it
// (index.js _installFileDrop). The chip list is its own part ("form-files") so
// adding, finishing or removing a file re-feeds the chips alone — the modal
// around them is never re-fed (see index.js "in-place form updates").
const { fileKey, fileIcon } = require("../attachments");

function fileChips(ui, list) {
  const pfx = ui.fig.family;
  return (list || []).map((pf) => {
    const key = fileKey(pf);
    const name = pf.extension ? `${pf.filename}.${pf.extension}` : pf.filename;
    const ico = fileIcon(pf);
    return Skeletons.Box.X({
      className: `${pfx}__file`,
      // data-ico: the skin styles some glyphs per type (the Office ones).
      attrOpt: { "data-key": key, "data-status": pf.status || "queued", "data-ico": ico, title: name },
      kids: [
        Skeletons.Image.Svg({ ico, className: `${pfx}__file-ico` }),
        Skeletons.Note({ className: `${pfx}__file-name`, content: name }),
        pf.status === "error"
          ? Skeletons.Note({
              className: `${pfx}__file-retry`,
              content: LOCALE.RETRY,
              bubble: 0,
              service: "cal-file-retry",
              uiHandler: [ui],
              calFileKey: key,
            })
          : null,
        Skeletons.Button.Svg({
          className: `${pfx}__file-remove`,
          ico: "cross",
          bubble: 0,
          service: "cal-file-remove",
          uiHandler: [ui],
          calFileKey: key,
          attrOpt: { "aria-label": LOCALE.REMOVE },
        }),
      ].filter(Boolean),
    });
  });
}

module.exports = function (ui) {
  const pfx = ui.fig.family;
  const form = ui.getForm() || {};
  const list = (form.draft && form.draft.files) || [];
  return Skeletons.Box.Y({
    className: `${pfx}__files`,
    // data-has-files hides the drop row once something is attached (skin);
    // _renderFiles keeps it current without re-feeding the block.
    attrOpt: { "data-drop-zone": "files", "data-has-files": list.length ? "1" : "0" },
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__files-drop`,
        bubble: 0,
        service: "cal-pick-files",
        uiHandler: [ui],
        // active:0 or the icon/label eat the click before the service fires.
        kidsOpt: { active: 0 },
        kids: [
          Skeletons.Image.Svg({ ico: "app-attachment", className: `${pfx}__files-ico` }),
          Skeletons.Note({ className: `${pfx}__files-hint`, content: LOCALE.CAL_DROP_OR_BROWSE }),
        ],
      }),
      Skeletons.Box.Y({
        className: `${pfx}__files-list`,
        sys_pn: "form-files",
        partHandler: ui,
        attrOpt: { "data-count": String(list.length) },
        kids: fileChips(ui, list),
      }),
      Skeletons.Note({ className: `${pfx}__files-overlay`, content: LOCALE.DROP_FILES_TO_ATTACH }),
    ],
  });
};

module.exports.fileChips = fileChips;

// ── task modal Files (Figma 1693:198659 / 1693:198307) ──────────────────────
// "Search file" + Upload over a row of paperclip chips, the Meet tab modal's
// Files section. The block keeps the drop-zone contract above
// (data-drop-zone, part "form-files", data-has-files) so a computer file
// dropped on it still uploads, and _renderFiles re-feeds the chips alone.

const chipName = (pf) => (pf.extension ? `${pf.filename}.${pf.extension}` : pf.filename || "");

// One chip per staged, picked or linked file. Every chip carries its ✕: a
// staged one leaves the list, a linked one is unlinked (index.js _removeFile).
function taskFileChips(ui, list) {
  const pfx = ui.fig.family;
  return (list || []).map((pf) => {
    const key = fileKey(pf);
    const name = chipName(pf);
    return Skeletons.Box.X({
      className: `${pfx}__fchip`,
      attrOpt: { "data-key": key, "data-status": pf.status || "queued", title: name },
      kids: [
        Skeletons.Image.Svg({ ico: "app-attachment", className: `${pfx}__fchip-ico` }),
        Skeletons.Note({ className: `${pfx}__fchip-name`, content: name }),
        pf.status === "error"
          ? Skeletons.Note({
              className: `${pfx}__fchip-retry`,
              content: LOCALE.RETRY,
              bubble: 0,
              service: "cal-file-retry",
              uiHandler: [ui],
              calFileKey: key,
            })
          : null,
        Skeletons.Button.Svg({
          className: `${pfx}__fchip-remove`,
          ico: "cross",
          bubble: 0,
          service: "cal-file-remove",
          uiHandler: [ui],
          calFileKey: key,
          attrOpt: { "aria-label": LOCALE.REMOVE },
        }),
      ].filter(Boolean),
    });
  });
}

// task.search_files rows under the Search file field; a click picks the file.
function fileResults(ui, rows) {
  const pfx = ui.fig.family;
  return (rows || []).map((r) =>
    Skeletons.Box.X({
      className: `${pfx}__fsearch-option`,
      bubble: 0,
      service: "cal-pick-file",
      uiHandler: [ui],
      calNid: r.nid,
      kidsOpt: { active: 0 },
      kids: [
        Skeletons.Image.Svg({ ico: "app-attachment", className: `${pfx}__fchip-ico` }),
        Skeletons.Note({
          className: `${pfx}__fchip-name`,
          content: chipName({ filename: r.filename, extension: r.ext || r.extension }),
        }),
      ],
    }),
  );
}

function taskFiles(ui) {
  const pfx = ui.fig.family;
  const form = ui.getForm() || {};
  const list = (form.draft && form.draft.files) || [];
  return Skeletons.Box.Y({
    className: `${pfx}__files ${pfx}__files--search`,
    attrOpt: { "data-drop-zone": "files", "data-has-files": list.length ? "1" : "0" },
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__fsearch`,
        kids: [
          // `watch` re-arms itself when the Entry rebuilds its <input>; the
          // results open on focus (index.js _installFileDrop).
          Skeletons.Entry({
            className: `${pfx}__fsearch-input`,
            name: "cal-file-search",
            placeholder: LOCALE.SEARCH_FILE,
            watch: "cal-file-typed",
            bubble: 0,
            uiHandler: [ui],
          }),
          Skeletons.Box.X({
            className: `${pfx}__fsearch-upload`,
            bubble: 0,
            service: "cal-pick-files",
            uiHandler: [ui],
            // active:0 or the icon/label eat the click before the service fires.
            kidsOpt: { active: 0 },
            kids: [
              Skeletons.Image.Svg({ ico: "upload-simple", className: `${pfx}__fsearch-upload-ico` }),
              Skeletons.Note({ className: `${pfx}__fsearch-upload-label`, content: LOCALE.UPLOAD }),
            ],
          }),
          Skeletons.Box.Y({
            className: `${pfx}__fsearch-results`,
            sys_pn: "form-files-results",
            partHandler: ui,
            attrOpt: { "data-open": "0" },
          }),
        ],
      }),
      Skeletons.Box.X({
        className: `${pfx}__fchips`,
        sys_pn: "form-files",
        partHandler: ui,
        attrOpt: { "data-count": String(list.length) },
        kids: taskFileChips(ui, list),
      }),
      Skeletons.Note({ className: `${pfx}__files-overlay`, content: LOCALE.DROP_FILES_TO_ATTACH }),
    ],
  });
}

module.exports.taskFiles = taskFiles;
module.exports.taskFileChips = taskFileChips;
module.exports.fileResults = fileResults;
