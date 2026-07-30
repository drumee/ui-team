const STATUS_OPTIONS = [
  {
    ico: "desktop_group",
    label: LOCALE.INTERNAL_WORKSPACE,
    desc: LOCALE.INTERNAL_WORKSPACE_HINT,
    initial: 1,
    name: "team",
  },
  {
    ico: "desktop_sharing",
    label: LOCALE.EXTERNAL_WORKSPACE,
    desc: LOCALE.EXTERNAL_WORKSPACE_HINT,
    initial: 0,
    name: "share",
  },
  {
    ico: "account_padlock",
    label: LOCALE.PERSONAL_WORKSPACE,
    desc: LOCALE.PERSONAL_WORKSPACE_HINT,
    initial: 0,
    name: "personal",
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
    kidsOpt: { active: 0 },
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__option-left`,
        active: 0,
        kidsOpt: { active: 0 },
        kids: [
          Skeletons.Image.Svg({
            ico: opt.ico,
            className: `${pfx}__option-ico ${opt.name}`,
          }),
          Skeletons.Box.Y({
            className: `${pfx}__option-info`,
            active: 0,
            kidsOpt: { active: 0 },
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
      // Inline validation message, rendered directly below the input. Hidden
      // until _submit populates it (see form/index.js _setNameError).
      Skeletons.Note({
        className: `${pfx}__input-error`,
        sys_pn: "name-error",
        content: "",
      }),
      // Slot for the quota-exceeded block. Empty for every other outcome.
      //
      // A separate slot rather than reusing name-error: that one is a Note, so
      // it can only hold a sentence, and the workspace limit is not a problem
      // with the NAME the user typed. Putting "you have used all your
      // workspaces" under the field, in the field's error style, would read as
      // "that name is invalid" — which is why this sits below it with its own
      // presentation and its own way out.
      Skeletons.Box.Y({
        className: `${pfx}__quota-slot`,
        sys_pn: "quota-slot",
      }),
    ],
  });

  const statusField = Skeletons.Box.Y({
    className: `${pfx}__field-group`,
    kids: [
      Skeletons.Note({
        className: `${pfx}__field-label`,
        content: LOCALE.WORKSPACE_TYPE,
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
