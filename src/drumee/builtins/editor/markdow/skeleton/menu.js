function item(ui, service, ico, content) {
  const btn = `${ui.fig.group}`;
  const fig = `${btn}__dropdown-menu`;
  return Skeletons.Box.X({
    className: `${fig}__item`,
    uiHandler: ui,
    service,
    kidsOpt: {
      active: 0,
    },
    kids: [
      Skeletons.Button.Svg({
        ico,
        className: `${fig}__icon`,
      }),
      Skeletons.Note({
        className: `${fig}__name`,
        content,
      }),
    ],
  });
}

module.exports = function (ui) {
  const btn = `${ui.fig.group}`;
  const fig = `${btn}__dropdown-menu`;
  const menuTrigger = Skeletons.Button.Label({
    className: `${btn}__label-button`,
    label: LOCALE.NOTE,
    ico: "carret-down",
    uiHandler: ui,
    partHandler: ui,
  });

  let exportHtml = "";
  let exportPdf = "";
  // `exportWord` was never declared — only assigned inside the canUpload() branch
  // below, while `kids` reads it unconditionally. This module is CommonJS (so not
  // strict), which is why the writable case silently worked: the assignment created
  // an implicit global. For a viewer who CANNOT upload the branch never runs, so the
  // read hit an undeclared identifier and threw ReferenceError inside _loadContent —
  // a view-only share recipient got "an internal error has occurred" and the note
  // never rendered at all. Declared like its two siblings; "" is dropped by the
  // framework's validChild filter exactly as theirs is.
  let exportWord = "";
  let print = item(ui, "print", "print", LOCALE.PRINT);
  if (ui.canUpload()) {
    exportPdf = item(ui, "save-pdf", "app-pdf-file", LOCALE.EXPORT_AS_PDF);
    exportHtml = item(ui, "save-html", "app-html-file", LOCALE.EXPORT_AS_HTML);
    exportWord = item(ui, "save-docx", "app-doc-file", LOCALE.EXPORT_AS_DOCX);
  }
  const separator = Skeletons.Box.X({
    className: `${fig}__separator`,
  });

  const menuItems = Skeletons.Box.X({
    className: `${fig}__items-wrapper`,
    kids: [
      Skeletons.Box.Y({
        className: `${fig}__items`,
        kids: [exportHtml, exportPdf, exportWord, separator, print],
      }),
    ],
  });

  return {
    kind: KIND.menu.topic,
    sys_pn: "markdown-menu",
    className: `${fig}__wrapper`,
    flow: _a.y,
    opening: _e.click,
    persistence: _a.none,
    trigger: menuTrigger,
    items: menuItems,
  };
};
