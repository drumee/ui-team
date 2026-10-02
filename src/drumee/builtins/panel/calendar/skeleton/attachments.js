// Attachments block shared by the personal task and meeting modals.
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
