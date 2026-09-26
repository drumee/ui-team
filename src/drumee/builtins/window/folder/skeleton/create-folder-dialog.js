// The folder shape the desk draws everywhere it names a place.
const folderArt = require("media/grid/template/folder");

/**
 * @param {Object} ui the widget the dialog's controls report to
 * @param {Object} [opt]
 * @param {String} [opt.prefix] BEM prefix — the migrate tour draws this card
 *   with the folder window's own, so it takes that window's styles
 * @param {String} [opt.area] the area the new folder belongs to, for its glyph;
 *   read off `ui` when omitted, which only works when `ui` IS the window
 */
module.exports = function createFolderDialog(ui, opt = {}) {
  const pfx = opt.prefix || `${ui.fig.family}__create-folder`;
  const area = opt.area || (ui.mget && ui.mget(_a.area)) || _a.personal;

  return Skeletons.Box.Y({
    className: `${pfx}-dialog`,
    debug: __filename,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}-header`,
        kids: [
          // What is being made, drawn as it will appear: a plain folder in
          // this window's area colour.
          Skeletons.Element({
            className: `${pfx}-icon`,
            content: folderArt({
              area,
              filetype: _a.folder,
              role: "",
              widgetId: _.uniqueId("create-folder-ico-"),
              // No kebab: there is nothing here for a context menu to act on.
              isAttachment: 1,
            }),
          }),
          Skeletons.Box.Y({
            className: `${pfx}-heading`,
            kids: [
              Skeletons.Note({
                className: `${pfx}-title`,
                content: LOCALE.CREATE_NEW_FOLDER,
              }),
              Skeletons.Note({
                className: `${pfx}-subtitle`,
                content: LOCALE.CREATE_FOLDER_DESCRIPTION,
              }),
            ],
          }),
          Skeletons.Button.Svg({
            className: `${pfx}-close`,
            ico: _a.cross,
            service: "close-folder-dialog",
            uiHandler: [ui],
          }),
        ],
      }),
      Skeletons.Box.Y({
        className: `${pfx}-content`,
        kids: [
          Skeletons.Note({
            className: `${pfx}-label`,
            content: LOCALE.FOLDER_NAME,
          }),
          Skeletons.EntryBox({
            className: `${pfx}-entry`,
            sys_pn: "create-folder-name",
            placeholder: LOCALE.NEW_FOLDER,
            require: _a.text,
            mode: _a.commit,
            service: "create-folder-submit",
            interactive: 1,
            preselect: 1,
            uiHandler: [ui],
            partHandler: ui,
            errorHandler: ui,
          }),
        ],
      }),
      Skeletons.Box.Y({
        className: `${pfx}-footer`,
        kids: [
          Skeletons.Note({
            className: `${pfx}-button primary`,
            content: LOCALE.CREATE,
            service: "create-folder-submit",
            uiHandler: [ui],
          }),
        ],
      }),
    ],
  });
};
