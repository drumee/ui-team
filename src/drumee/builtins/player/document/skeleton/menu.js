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

const cnWindowButton = "window-button";
const cnWindowButtonDropdownMenu = `${cnWindowButton}__dropdown-menu`;

function item(ui, service, ico, content) {
  return Skeletons.Box.X({
    className: `${cnWindowButtonDropdownMenu}__item`,
    uiHandler: ui,
    service,
    kidsOpt: {
      active: 0,
    },
    kids: [
      Skeletons.Button.Svg({
        ico,
        className: `${cnWindowButtonDropdownMenu}__icon`,
      }),
      Skeletons.Note({
        className: `${cnWindowButtonDropdownMenu}__name`,
        content,
      }),
    ],
  });
}

module.exports = function (ui) {
  let download, downloadPDF, edit, print;

  const menuTrigger = Skeletons.Button.Label({
    className: `${cnWindowButton}__label-button`,
    label: LOCALE.DOCUMENT,
    ico: "carret-down",
    uiHandler: ui,
    partHandler: ui,
  });

  download = item(ui, _a.download, _a.download, LOCALE.DOWNLOAD_ORIG);

  if (ui.mget(_a.ext) == _a.pdf) {
    downloadPDF = null;
  } else {
    downloadPDF = item(
      ui,
      "download-pdf",
      "app-pdf-file",
      LOCALE.DOWNLOAD_AS_PDF,
    );
  }

  if (ui.canUpload() && EDITABLE.includes(ui.mget(_a.ext).toLowerCase())) {
    if (ui.mget(_a.mode) == _a.edit) {
      edit = item(ui, "preview", "desktop_preview", LOCALE.PREVIEW);
    } else {
      if (Platform.get("doc_editor")) {
        edit = item(ui, _a.edit, "app-edit", LOCALE.EDIT);
      } else {
        edit = null;
      }
    }
  } else {
    edit = null;
  }

  print = item(ui, "print", "print", LOCALE.PRINT);

  const separator = Skeletons.Box.X({
    className: `${cnWindowButtonDropdownMenu}__separator`,
  });

  const menuItems = Skeletons.Box.X({
    className: `${cnWindowButtonDropdownMenu}__items-wrapper`,
    kids: [
      Skeletons.Box.Y({
        className: `${cnWindowButtonDropdownMenu}__items`,
        kids: [download, downloadPDF, separator, edit, print],
      }),
    ],
  });

  return Skeletons.Box.X({
    debug: __filename,
    className: `${cnWindowButton}__buttons-wrapper`,
    kids: [
      {
        kind: KIND.menu.topic,
        sys_pn: "document-menu",
        className: `${cnWindowButtonDropdownMenu}__wrapper`,
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
