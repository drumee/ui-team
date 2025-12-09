export default function (ui, label) {
  const figFamily = `${ui.fig.family}-topbar`;
  const figGroup = `${ui.fig.group}-topbar`;

  const close = Skeletons.Button.Svg({
    ico: _a.cross,
    className: `${figFamily}__icon-close ${figGroup}__icon-close`,
    service: _e.close,
    uiHandler: [ui]
  });

  const windowTitle = Skeletons.Box.X({
    className: `${figFamily}__content ${figGroup}__content`,
    kids: [
      Skeletons.Note({
        className: `${figFamily}__title ${figGroup}__title`,
        sys_pn: "window-name",
        content: label || "",
        partHandler: ui,
        uiHandler: [ui],
      }),
      close
    ],
  });

  return Skeletons.Box.X({
    debug: __filename,
    className: `${figFamily}__container ${figGroup}__container`,
    sys_pn: _a.topBar,
    service: _e.raise,
    kids: [windowTitle],
  });
}
