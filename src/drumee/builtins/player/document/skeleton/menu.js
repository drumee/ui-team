const EDITABLE = [
  "docx",
  "docm",
  "dotx",
  "dotm",
  "odt",
  "ott",
  "xlsx",
  "xlsm",
  "xltx",
  "xltm",
  "xlsb",
  "ods",
  "ots",
  "pptx",
  "pptm",
  "potx",
  "potm",
  "ppsx",
  "ppsm",
  "odp",
  "otp",
];

function item(ui, service, ico, content) {
  return Skeletons.Box.X({
    className: `dropdown-menu__item`,
    uiHandler: ui,
    service,
    kidsOpt: {
      active: 0,
    },
    kids: [
      Skeletons.Button.Svg({
        ico,
        className: `dropdown-menu__icon`,
      }),
      Skeletons.Note({
        className: `dropdown-menu__name`,
        content,
      }),
    ],
  });
}

module.exports = function (ui) {
  let download, downloadPDF, edit, print;

  const cnWidowTopbarActions = "window-topbar-actions";

  const menuTrigger = Skeletons.Button.Label({
    className: `${cnWidowTopbarActions}__label-button`,
    label: LOCALE.DOCUMENT,
    ico: "carret-down",
    uiHandler: ui,
    partHandler: ui,
  });

  download = item(ui, _a.download, _a.download, LOCALE.DOWNLOAD_ORIG);

  if (ui.mget(_a.ext) == _a.pdf) {
    downloadPDF = null;
  } else {
    downloadPDF = item(ui, "download-pdf", "file-pdf", LOCALE.DOWNLOAD_AS_PDF);
  }

  if (ui.canUpload() && EDITABLE.includes(ui.mget(_a.ext).toLowerCase())) {
    if (ui.mget(_a.mode) == _a.edit) {
      edit = item(ui, "preview", "desktop_preview", LOCALE.PREVIEW);
    } else {
      edit = item(ui, _a.edit, "desktop_edit", LOCALE.EDIT);
    }
  } else {
    edit = null;
  }

  print = item(ui, "print", "print", LOCALE.PRINT);

  const separator = Skeletons.Box.X({
    className: `dropdown-menu__separator`,
  });

  const menuItems = Skeletons.Box.X({
    className: `dropdown-menu__items-wrapper`,
    kids: [
      Skeletons.Box.Y({
        className: `dropdown-menu__items`,
        kids: [download, downloadPDF, separator, edit, print],
      }),
    ],
  });

  return Skeletons.Box.X({
    debug: __filename,
    className: `${cnWidowTopbarActions}__buttons-wrapper`,
    kids: [
      {
        kind: KIND.menu.topic,
        sys_pn: "document-menu",
        className: `dropdown-menu__wrapper`,
        flow: _a.y,
        opening: _e.click,
        persistence: _a.none,
        trigger: menuTrigger,
        items: menuItems,
      },
      require("../../skeleton/control")(ui),
    ],
  });
};
