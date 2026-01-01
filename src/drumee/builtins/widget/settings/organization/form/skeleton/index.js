const { button } = require("builtins/skeleton/toolkit");

export default function (ui, service) {
  const fig = `${ui.fig.family}`;
  const buttons = Skeletons.Box.X({
    className: `${fig}__buttons`,
    uiHandler: ui,
    sys_pn: _a.footer,
    dataset: { page: ui._page },
    kids: [
      button(ui, {
        label: LOCALE.CANCEL,
        type: _a.toggle,
        className: `${fig}__button`,
        service: _e.close,
        priority: "secondary",
      }),
      button(ui, {
        label: LOCALE.CONFIRM,
        type: _a.toggle,
        className: `${fig}__button`,
        service: "create-organization",
        ico: "arrow-right",
        flow: 'g',
        priority: "primary",
      }),
    ],
  });
  let name = 'ident'
  return Skeletons.Box.Y({
    className: `${fig}__main`,
    kids: [
      Skeletons.Note({
        className: `${ui.fig.family}__text`,
        content: 'Create your Drumee Space'
      }),
      Skeletons.Box.G({
        className: `${fig}-name`,
        kids: [
          Skeletons.Note({
            className: `${ui.fig.family}__text`,
            content: LOCALE.DESCRIPTION
          }),
          Skeletons.Entry({
            className: `${fig}-input`,
            name: _a.name,
            formItem: _a.name,
            mode: _a.submit,
            placeholder: "",
            sys_pn: "org_name",
            uiHandler: [ui],
          }),
        ]
      }),
      Skeletons.Box.G({
        className: `${fig}-url`,
        kids: [
          Skeletons.Note({
            className: `${fig}__text`,
            content: LOCALE.URL_ADDRESS
          }),
          Skeletons.Entry({
            className: `${fig}-input`,
            name: _a.ident,
            formItem: _a.ident,
            mode: _a.submit,
            placeholder: "",
            sys_pn: "host-input",
            uiHandler: [ui],
          }),
          Skeletons.Note({
            className: `${ui.fig.family}__text`,
            content: `.${bootstrap().main_domain}`
          })
        ]
      }),
      Skeletons.Note({
        sys_pn: "error",
        className: `${fig}__text error`,
        content: ""
      }),
      buttons
    ]
  })
}

