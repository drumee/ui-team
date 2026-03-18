const { button } = require("../../../skeleton/toolkit/buttons");
const COLORS = ["gray", "red", "pink", "blue", "green", "yellow", "orange"];
const { filesize, dataTransfer } = require("@drumee/ui-essentials");

function __skl_window_wallpaper_settings_content(ui, opt) {
  const contentFig = `${ui.fig.family}-content`;
  const fig = `${ui.fig.family}`;

  const uploader = Skeletons.Box.Y({
    className: `${fig}__uploader`,
    sys_pn: "uploader",
    partHandler: [ui],
    kids: [
      Skeletons.FileSelector({
        accept: "image/*",
      }),
      Skeletons.Box.Y({
        className: `${fig}__uploader-content`,
        kids: [
          button(ui, {
            label: LOCALE.CHANGE_UPLOAD_IMAGE || "Change / Upload Image",
            type: _a.toggle,
            className: `${fig}__upload-button`,
            service: "upload-image",
            priority: "primary",
          }),
          Skeletons.Note({
            className: `${fig}__uploader-progress`,
            sys_pn: "uploader-progress",
            state: 0,
          }),
          Skeletons.Note({
            content: LOCALE.MAX_FILE_SIZE_X.format(
              filesize(ui.mget("maxSize"))
            ),
            className: `${fig}__uploader-text`,
            sys_pn: "file-size-text",
          }),
        ],
      }),
    ],
  });

  const imagesList = Skeletons.List.Smart({
    className: `${fig}__images-list`,
    debug: __filename,
    spinner: Skeletons.Note("", _a.spinner),
    minPage: 3,
    sys_pn: "roll-wallpaper",
    api: ui.getCurrentApi,
    vendorOpt: Preset.List.Orange_e,
    itemsOpt: {
      kind: KIND.media.preview,
      className: `${fig}__image`,
      service: "set-wallpaper",
      uiHandler: [ui],
      format: _a.card,
    },
  });

  // Create color items with service binding
  const colorItems = COLORS.map((name) =>
    Skeletons.Box.X({
      className: `${fig}__colors-wrapper item color-${name}`,
      service: "set-bg-color", // This triggers the onUiEvent handler
      uiHandler: [ui],
      name,
      radio: `color-radio-${ui._id}`,
      // attributes: {
      //   "data-color-name": name, // Store color name for easy access
      // },
    })
  );

  let i = 0; /** Defqult selection index */
  const { color } = Visitor.wallpaper();
  if (color) {
    for (let name of COLORS) {
      if (name == color.name) {
        break;
      }
      i++;
    }
  }
  colorItems[i].state = "1";

  const colorsWrapper = Skeletons.Box.X({
    className: `${fig}__colors-wrapper`,
    sys_pn: "colors-wrapper", // Add system part name for element lookup
    uiHandler: ui,
    kids: colorItems,
  });

  const colorsList = Skeletons.Box.X({
    className: `${fig}__colors`,
    kidsOpt: { active: 0 },
    uiHandler: ui,
    kids: [
      Skeletons.Note({
        content: LOCALE.COLORS || "Colors",
        className: `${fig}__color colors-text`,
      }),
      colorsWrapper,
    ],
  });

  const buttons = Skeletons.Box.X({
    className: `${fig}__buttons`,
    // kidsOpt: { active: 0 },
    uiHandler: ui,
    kids: [
      button(ui, {
        label: LOCALE.CANCEL,
        type: _a.toggle,
        className: `${fig}__button`,
        service: "cancel-set-bg",
        priority: "secondary",
      }),
      button(ui, {
        label: LOCALE.APPLY_AND_SAVE,
        type: _a.toggle,
        className: `${fig}__button`,
        service: "apply-new-bg",
        priority: "primary",
      }),
    ],
  });

  const footer = Skeletons.Box.Y({
    className: `${contentFig}__footer`,
    kids: [buttons],
  });

  return Skeletons.Box.Y({
    className: `${contentFig}__container`,
    debug: __filename,
    kids: [
      Skeletons.Box.Y({
        className: `${contentFig}__body-content`,
        kids: [uploader, imagesList, colorsList],
      }),
      footer,
    ],
  });
}

export default __skl_window_wallpaper_settings_content;
