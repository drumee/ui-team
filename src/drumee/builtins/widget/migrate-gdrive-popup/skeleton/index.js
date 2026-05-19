/**
 * Migrate-from-Google-Drive popup skeleton.
 *
 * Single-step form:
 *  - Title + close
 *  - Description + destination read-only label
 *  - Google Drive folder ID input (blank = entire My Drive)
 *  - Status line (info / error)
 *  - Cancel + Start migration buttons
 */
module.exports = function (ui) {
  const pfx = ui.fig.family;

  const header = Skeletons.Box.X({
    className: `${pfx}__header`,
    kids: [
      Skeletons.Note({
        className: `${pfx}__title`,
        content: LOCALE.MIGRATE_GDRIVE_TITLE || "Migrate from Google Drive",
      }),
      Skeletons.Button.Svg({
        className: `${pfx}__close`,
        ico: "cross",
        service: "close-migrate-popup",
        uiHandler: [ui],
      }),
    ],
  });

  const description = Skeletons.Note({
    className: `${pfx}__description`,
    content:
      LOCALE.MIGRATE_GDRIVE_HINT ||
      "Imports files and folders from your Google Drive into Drumee. Google Workspace files (Docs, Sheets, Slides) are exported as PDF/XLSX/PPTX.",
  });

  const destinationRow = Skeletons.Box.Y({
    className: `${pfx}__field`,
    kids: [
      Skeletons.Note({
        className: `${pfx}__field-label`,
        content: LOCALE.DESTINATION || "Destination",
      }),
      Skeletons.Note({
        className: `${pfx}__destination`,
        content: ui._destinationName,
      }),
    ],
  });

  const folderIdRow = Skeletons.Box.Y({
    className: `${pfx}__field`,
    kids: [
      Skeletons.Note({
        className: `${pfx}__field-label`,
        content: LOCALE.GOOGLE_DRIVE_FOLDER_ID || "Google Drive folder ID",
      }),
      Skeletons.Entry({
        className: `${pfx}__entry`,
        sys_pn: "folder-id-input",
        partHandler: ui,
        placeholder: LOCALE.GOOGLE_DRIVE_FOLDER_ID_PLACEHOLDER
          || "Leave blank to import entire My Drive",
        require: "any",
        bubble: 0,
      }),
      Skeletons.Note({
        className: `${pfx}__field-help`,
        content: LOCALE.GOOGLE_DRIVE_FOLDER_ID_HELP
          || "Paste the folder ID from the Drive URL (https://drive.google.com/drive/folders/<id>) to migrate a subset.",
      }),
    ],
  });

  const status = Skeletons.Note({
    className: `${pfx}__status`,
    sys_pn: "status",
    partHandler: ui,
    state: 0,
    content: "",
  });

  const footer = Skeletons.Box.X({
    className: `${pfx}__footer`,
    kids: [
      Skeletons.Note({
        className: `${pfx}__cancel`,
        content: LOCALE.CANCEL || "Cancel",
        service: "close-migrate-popup",
        uiHandler: [ui],
      }),
      Skeletons.Note({
        className: `${pfx}__submit-btn`,
        sys_pn: "submit-btn",
        partHandler: ui,
        content: LOCALE.START_MIGRATION || "Start migration",
        service: "start-migration",
        uiHandler: [ui],
        state: 1,
      }),
    ],
  });

  return Skeletons.Box.Y({
    className: `${pfx}__container`,
    debug: __filename,
    kids: [header, description, destinationRow, folderIdRow, status, footer],
  });
};
