export default function (ui) {
  const figFamily = `${ui.fig.family}-topbar`;
  const figGroup = `${ui.fig.group}-topbar`;

  const windowTitle = Skeletons.Box.X({
    className: `${figFamily}__content ${figGroup}__content topbar-content`,
    kids: [
      Skeletons.Note({
        className: "title",
        sys_pn: "window-name",
        content: LOCALE.CUSTOMIZE_BACKGROUND || "Customize Background",
        partHandler: ui,
        uiHandler: ui,
      }),
    ],
  });

  const a = Skeletons.Box.X({
    debug: __filename,
    className: `${figFamily}__container ${figGroup}__container`,
    sys_pn: _a.topBar,
    service: _e.raise,
    kids: [windowTitle, require("window/skeleton/topbar/control")(ui, "c")],
  });

  return a;
}
