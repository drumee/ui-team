const EDITABLE = [
  'docx', 'docm', 'dotx', 'dotm', 'odt', 'ott', 'xlsx', 'xlsm', 'xltx',
  'xltm', 'xlsb', 'ods', 'ots', 'pptx', 'pptm', 'potx', 'potm', 'ppsx',
  'ppsm', 'odp', 'otp'
];

/**
 * 
 * @param {*} ui 
 * @param {*} ico 
 * @param {*} content 
 * @returns 
 */
function item(ui, service, ico, content) {
  const menuFig = `${ui.fig.family}-menu`;
  return Skeletons.Box.X({
    className: `${menuFig}__item`,
    uiHandler: ui,
    service,
    kidsOpt: {
      active: 0,
    },
    kids: [
      Skeletons.Button.Svg({
        ico,
        className: `${menuFig}__icon`,
      }),

      Skeletons.Note({
        className: `${menuFig}__name `,
        content,
      }),
    ],
  });
}

module.exports = function (ui) {
  let download, downloadPDF, edit, print;
  const menuFig = `${ui.fig.family}-menu`;
  const cnWidowMenuBtn = "window-menu";

  const menuTrigger = Skeletons.Box.X({
    className: `${cnWidowMenuBtn}__button-wrapper`,
    kids: [
      Skeletons.Button.Svg({
        ico: "carret-down",
        className: `${cnWidowMenuBtn}__icon`,
      }),
      Skeletons.Note({
        // sys_pn: "ref-window-name",
        uiHandler: ui,
        partHandler: ui,
        content: LOCALE.DOCUMENT,
      }),
    ],
  });

  download = item(ui, _a.download, _a.download, LOCALE.DOWNLOAD_ORIG)

  if (ui.mget(_a.ext) == _a.pdf) {
    downloadPDF = null
  } else {
    downloadPDF = item(ui, 'download-pdf', "file-pdf", LOCALE.DOWNLOAD_AS_PDF)
  }

  if (ui.canUpload() && EDITABLE.includes(ui.mget(_a.ext).toLowerCase())) {
    if (ui.mget(_a.mode) == _a.edit) {
      edit = item(ui, 'preview', "desktop_preview", LOCALE.PREVIEW)
    } else {
      edit = item(ui, _a.edit, "desktop_edit", LOCALE.EDIT)
    }
  } else {
    edit = null;
  }

  print = item(ui, "print", "print", LOCALE.PRINT)

  const separator = Skeletons.Box.X({
    className: `${menuFig}__separator`,
  });

  const menuItems = Skeletons.Box.X({
    className: `${menuFig}__items-wrapper`,
    kids: [
      Skeletons.Box.Y({
        className: `${menuFig}__items`,
        kids: [download, downloadPDF, separator, edit, print],
      }),
    ],
  });

  return Skeletons.Box.X({
    debug: __filename,
    className: `${menuFig}__dropdown ${ui.fig.group}__dropdown`,
    kids: [
      {
        kind: KIND.menu.topic,
        sys_pn: "document-menu",
        className: `${menuFig}__wrapper ${ui.fig.group}__wrapper`,
        flow: _a.y,
        opening: _e.click,
        persistence: _a.none,
        trigger: menuTrigger,
        items: menuItems,
      },
    ],
  });
};
