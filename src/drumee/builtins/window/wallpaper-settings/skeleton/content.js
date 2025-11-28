const { button } = require('../../../skeleton/toolkit/index');

function __skl_window_wallpaper_settings_content(_ui_, opt) {
  const contentFig = `${_ui_.fig.family}-content`;
  const fig = `${_ui_.fig.family}`;

  const uploader = Skeletons.Box.Y({
    className: `${fig}__uploader`,
    sys_pn: "uploader",
    partHandler: [_ui_],
    kids: [
      Skeletons.FileSelector({
        sys_pn: "fselector",
        bubble: 0,
        service: "",
        partHandler: [_ui_],
        uiHandler: [_ui_]
      }),
      Skeletons.Box.Y({
        className: `${fig}__uploader-content`,
        kids: [
          button(_ui_, {
            label: LOCALE.CHANGE_UPLOAD_IMAGE || "Change / Upload Image",
            type: _a.toggle,
            className: `${fig}__upload-button`,
            service: "upload-image",
            priority: "primary"
          }),
          Skeletons.Note({
            content: LOCALE.MAX_FILE_SIZE || "Max file size up to 284 kb.",
            className: `${fig}__uploader-text`,
            sys_pn: "file-size-text",
          })
        ]
      })
    ]
  });

  const imagesList = Skeletons.List.Smart({
    className: `${fig}__images-list`,
    debug: __filename,
    spinner: Skeletons.Note('', _a.spinner),
    minPage: 3,
    sys_pn: 'roll-wallpaper',
    api: _ui_.getCurrentApi,
    vendorOpt: Preset.List.Orange_e,
    itemsOpt: {
      kind: KIND.media.preview,
      className: `${fig}__image`,
      service: 'set-wallpaper',
      uiHandler: [_ui_],
      format: _a.card
    }
  });

  // Color swatches - predefined colors
  const colorSwatches = [
    { color: '#FFFFFF', value: '#FFFFFF' }, // white
    { color: '#EA4D44', value: '#EA4D44' }, // red
    { color: '#FF4578', value: '#FF4578' }, // pink
    { color: '#C647D5', value: '#C647D5' }, // purple
    { color: '#4A90E2', value: '#4A90E2' }, // blue
    { color: '#18A3AC', value: '#18A3AC' }, // teal
    { color: '#36E692', value: '#36E692' }, // green
    { color: '#FFD700', value: '#FFD700' }, // yellow
    { color: '#FA8540', value: '#FA8540' }  // orange
  ];

  const colorsSection = Skeletons.Box.X({
    className: `${fig}__colors`,
    kids: [
      Skeletons.Note({
        content: LOCALE.COLORS || "Colors",
        className: `${fig}__colors-title`,
      }),
      Skeletons.Box.X({
        className: `${fig}__colors-swatches`,
        kids: colorSwatches.map((swatch) =>
          Skeletons.Element({
            className: `${fig}__color-swatch`,
            tagName: _K.tag.div,
            dataset: {
              color: swatch.value,
              selected: 0
            },
            style: {
              backgroundColor: swatch.value,
            },
            service: 'select-color',
            uiHandler: [_ui_],
          })
        )
      })
    ]
  });

  const buttons = Skeletons.Box.X({
    className: `${fig}__buttons`,
    kidsOpt: { active: 0 },
    uiHandler: _ui_,
    kids: [
      button(_ui_, {
        label: LOCALE.CANCEL,
        type: _a.toggle,
        className: `${fig}__button`,
        service: "cancel-set-bg",
        priority: "secondary"
      }),
      button(_ui_, {
        label: LOCALE.APPLY_AND_SAVE || "Apply & Save",
        type: _a.toggle,
        className: `${fig}__button`,
        service: "apply-new-bg",
        priority: "primary"
      })
    ],
  });

  const footer = Skeletons.Box.X({
    className: `${contentFig}__footer`,
    kids: [
      buttons,
    ],
  });

  let a = Skeletons.Box.Y({
    className: `${contentFig}__container`,
    debug: __filename,
    kids: [
      Skeletons.Box.Y({
        className: `${contentFig}__body-content`,
        kids: [
          uploader,
          imagesList,
          colorsSection
        ]
      }),
      footer
    ]
  });

  return a;
}

export default __skl_window_wallpaper_settings_content;

