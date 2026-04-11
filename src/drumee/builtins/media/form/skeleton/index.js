const STATUS_OPTIONS = [
  // {
  //   ico: 'dock-folder',
  //   label: LOCALE.SUB_FOLDER,
  //   desc: LOCALE.SUB_FOLDER_HINT,
  //   initial: 1,
  //   name: 'subfolder'
  // },
  // {
  //   ico: 'lock',
  //   label: LOCALE.PRIVATE_WORKSPACE,
  //   desc: LOCALE.PRIVATE_WORKSPACE_HINT,
  //   initial: 0,
  //   name: 'personal'
  // },
  {
    ico: 'desktop_sharing',
    label: LOCALE.PUBLIC_WORKSPACE,
    desc: LOCALE.SHARE_WORKSPACE_HINT,
    initial: 1,
    name: 'share'
  },
  {
    ico: 'desktop_group',
    label: LOCALE.RESTRICTED_WORKSPACE,
    desc: LOCALE.RESTRICTED_WORKSPACE_HINT,
    initial: 0,
    name: 'team'
  },
];

function statusOption(ui, opt) {
  const pfx = ui.fig.family;
  return Skeletons.Box.X({
    className: `${pfx}__option`,
    state: opt.initial,
    service: 'select-status',
    dataset: { value: opt.value },
    uiHandler: ui,
    formItem: opt.name,
    radio: `${ui._id}`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__option-left`,
        kids: [
          Skeletons.Image.Svg({ ico: opt.ico, className: `${pfx}__option-ico` }),
          Skeletons.Box.Y({
            className: `${pfx}__option-info`,
            kids: [
              Skeletons.Note({ className: `${pfx}__option-label`, content: opt.label }),
              Skeletons.Note({ className: `${pfx}__option-desc`, content: opt.desc }),
            ],
          }),
        ],
      }),
      Skeletons.Element({ className: `${pfx}__option-circle` }),
      // Skeletons.Image.Svg({
      //   ico: opt.initial ? 'radio-on' : 'radio-off',
      //   className: `${pfx}__option-radio`,
      //   sys_pn: `radio-${opt.value}`,
      // }),
    ],
  });
}

module.exports = function (ui) {
  const pfx = ui.fig.family;

  const header = Skeletons.Box.X({
    className: `${pfx}__header`,
    kids: [
      Skeletons.Box.Y({
        className: `${pfx}__header-text`,
        kids: [
          Skeletons.Note({ className: `${pfx}__title`, content: LOCALE.CREATE_NEW_WORSPACE }),
          Skeletons.Note({ className: `${pfx}__subtitle`, content: LOCALE.CREATE_NEW_WORSPACE_HINT }),
        ],
      }),
      Skeletons.Button.Svg({
        className: `${pfx}__close`,
        ico: 'cross',
        service: 'close',
        uiHandler: [ui],
      }),
    ],
  });

  const nameField = Skeletons.Box.Y({
    className: `${pfx}__field-group`,
    kids: [
      Skeletons.Note({ className: `${pfx}__field-label`, content: LOCALE.FOLDER_NAME }),
      Skeletons.Entry({
        className: `${pfx}__input`,
        sys_pn: 'folder-name',
        formItem: 'filename',
        placeholder: LOCALE.FOLDER_NAME,
        require: 'text',
        mode: 'commit',
        preselect: 1,
      }),
    ],
  });

  const statusField = Skeletons.Box.Y({
    className: `${pfx}__field-group`,
    kids: [
      Skeletons.Note({ className: `${pfx}__field-label`, content: LOCALE.TYPE }),
      Skeletons.Box.Y({
        className: `${pfx}__options`,
        kids: STATUS_OPTIONS.map((opt) => statusOption(ui, opt)),
      }),
    ],
  });

  const footer = Skeletons.Box.Y({
    className: `${pfx}__footer`,
    kids: [
      Skeletons.Button.Label({
        className: `${pfx}__submit`,
        label: LOCALE.CREATE,
        service: 'create-folder',
        uiHandler: ui,
      }),
    ],
  });

  return Skeletons.Box.Y({
    className: `${pfx}__main`,
    debug: __filename,
    kids: [header, nameField, statusField, footer],
  });
};
