const STATUS_OPTIONS = [
  {
    ico: "lock",
    label: LOCALE.PRIVATE,
    desc: LOCALE.PRIVATE_HINT,
    initial: 1,
    name: "personal",
  },
  {
    ico: "desktop_group",
    label: LOCALE.RESTRICTED_SHARE,
    desc: LOCALE.RESTRICTED_SHARE_HINT,
    initial: 0,
    name: "team",
  },
  {
    ico: "desktop_sharing",
    label: LOCALE.LINK_SHARED,
    desc: LOCALE.LINK_SHARED_HINT,
    initial: 0,
    name: "share",
  },
];

function statusOption(ui, opt) {
  const pfx = ui.fig.family;
  return Skeletons.Box.X({
    className: `${pfx}__option`,
    state: opt.initial,
    service: "select-status",
    dataset: { value: opt.value, type: opt.name },
    uiHandler: [ui],
    formItem: opt.name,
    radio: `${ui._id}`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__option-left`,
        kids: [
          Skeletons.Image.Svg({
            ico: opt.ico,
            className: `${pfx}__option-ico ${opt.name}`,
          }),
          Skeletons.Box.Y({
            className: `${pfx}__option-info`,
            kids: [
              Skeletons.Note({
                className: `${pfx}__option-label`,
                content: opt.label,
              }),
              Skeletons.Note({
                className: `${pfx}__option-desc`,
                content: opt.desc,
              }),
            ],
          }),
        ],
      }),
      Skeletons.Element({ className: `${pfx}__option-circle` }),
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
          Skeletons.Note({
            className: `${pfx}__title`,
            content: LOCALE.CREATE_NEW_WORKSPACE,
          }),
          Skeletons.Note({
            className: `${pfx}__subtitle`,
            content: LOCALE.CREATE_NEW_WORKSPACE_HINT,
          }),
        ],
      }),
      Skeletons.Button.Svg({
        className: `${pfx}__close`,
        ico: "cross",
        service: "close",
        uiHandler: [ui],
      }),
    ],
  });

  const nameField = Skeletons.Box.Y({
    className: `${pfx}__field-group`,
    kids: [
      Skeletons.Note({
        className: `${pfx}__field-label`,
        content: LOCALE.WORKSPACE_NAME,
      }),
      Skeletons.Entry({
        className: `${pfx}__input`,
        sys_pn: "folder-name",
        formItem: "filename",
        placeholder: LOCALE.WORKSPACE_NAME_PLACEHOLDER,
        require: "text",
        mode: "commit",
        preselect: 1,
      }),
    ],
  });

  const statusField = Skeletons.Box.Y({
    className: `${pfx}__field-group`,
    kids: [
      Skeletons.Note({
        className: `${pfx}__field-label`,
        content: LOCALE.STATUS,
      }),
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
        service: "create-folder",
        uiHandler: [ui],
      }),
    ],
  });

  return Skeletons.Box.Y({
    className: `${pfx}__main`,
    debug: __filename,
    kids: [header, nameField, statusField, footer],
  });
};
