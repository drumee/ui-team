// Small "file created" card (bottom-right). Shown by notifyFileCreated
// (wm/index.js) after a new document / spreadsheet / presentation is
// created — the file no longer opens by itself. Clicking the body opens
// the file (service open-created-file); the × dismisses the card
// (service dismiss-created-file).

const ICONS = {
  docx: "addmenu-document",
  xlsx: "addmenu-spreadsheet",
  pptx: "addmenu-presentation",
};

module.exports = function (ui, data = {}) {
  const pfx = `${ui.fig.family}__file-created`;
  const filename = data.filename || data.name || "";
  const ext = (filename.split(".").pop() || "").toLowerCase();

  return Skeletons.Box.X({
    className: pfx,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}-body`,
        service: "open-created-file",
        uiHandler: [ui],
        kidsOpt: { active: 0 },
        kids: [
          Skeletons.Image.Svg({
            ico: ICONS[ext] || "addmenu-document",
            className: `${pfx}-ico`,
          }),
          Skeletons.Box.Y({
            className: `${pfx}-info`,
            kidsOpt: { active: 0 },
            kids: [
              Skeletons.Note({
                className: `${pfx}-title`,
                content: LOCALE.FILE_CREATED,
              }),
              Skeletons.Note({
                className: `${pfx}-name`,
                content: filename,
              }),
              Skeletons.Note({
                className: `${pfx}-hint`,
                content: LOCALE.CLICK_TO_OPEN,
              }),
            ],
          }),
        ],
      }),
      Skeletons.Button.Svg({
        ico: "cross",
        className: `${pfx}-close`,
        service: "dismiss-created-file",
        uiHandler: [ui],
      }),
    ],
  });
};
