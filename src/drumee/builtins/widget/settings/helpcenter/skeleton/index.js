const { button } = require("../../../../skeleton/toolkit");

/**
 *
 * @param {*} ui
 * @param {*} opt
 * @returns
 */
function helpcenter_body(ui) {
  const fig = ui.fig.family;

  const navbar = require("./navbar").default(ui);

  const header = Skeletons.Box.X({
    className: `${fig}__header`,
    kids: [
      Skeletons.Note({
        className: `${fig}__title`,
        sys_pn: "tab-name",
        content: ui.tab_name[ui._page],
      }),
      Skeletons.Button.Svg({
        ico: _a.cross,
        className: `${ui.fig.group}__icon close`,
        service: _e.close,
        uiHandler: [ui],
      }),
    ],
  });

  const content = Skeletons.Box.Y({
    className: `${fig}__content`,
    uiHandler: [ui],
    sys_pn: _a.content,
  });

  const group = ui.fig.group;
  // const buttons = Skeletons.Box.X({
  //   className: `${group}__buttons ${fig}__buttons`,
  //   uiHandler: ui,
  //   sys_pn: _a.footer,
  //   dataset: { page: ui._page },
  //   kids: [
  //     button(ui, {
  //       label: LOCALE.APPLY_ALL_AND_SAVE,
  //       type: _a.toggle,
  //       className: `${group}__button`,
  //       service: _e.save,
  //       priority: "primary",
  //     }),
  //   ],
  // });

  return Skeletons.Box.G({
    className: `${fig}__main`,
    debug: __filename,
    kids: [
      Skeletons.Box.Y({
        className: `${fig}__nav`,
        kids: navbar,
      }),
      Skeletons.Box.Y({
        className: `${fig}__container`,
        kids: [
          header,
          content,
          // buttons
        ],
      }),
    ],
  });
}

export default helpcenter_body;
