/* ==================================================================== *
 * org_setup_done skeleton -- the CTA after the organisation setup
 * (Figma 900:150473): a title, one line, "Start setting up your org chart
 * now" and Later.
 * ==================================================================== */

const say = (key, fallback) => (LOCALE[key] && LOCALE[key] !== key ? LOCALE[key] : fallback);

module.exports = function (ui) {
  const pfx = ui.fig.family;
  return Skeletons.Box.Y({
    className: `${pfx}__main`,
    debug: __filename,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__head`,
        kids: [
          Skeletons.Note({ className: `${pfx}__title`, content: say("ORG_READY_TITLE", "Your organization is ready") }),
          Skeletons.Button.Svg({
            className: `${pfx}__close`,
            ico: "cross",
            service: _e.close,
            uiHandler: [ui],
          }),
        ],
      }),
      Skeletons.Note({
        className: `${pfx}__body`,
        content: say("ORG_READY_BODY", "Departments and workspaces are in place. Next, map who reports to whom."),
      }),
      Skeletons.Box.Y({
        className: `${pfx}__actions`,
        kids: [
          Skeletons.Box.X({
            className: `${pfx}__btn ${pfx}__btn--primary`,
            service: "org-setup-done-chart",
            uiHandler: [ui],
            kids: [Skeletons.Note({ active: 0, content: say("ORG_CHART_CTA", "Start setting up your org chart now") })],
          }),
          Skeletons.Box.X({
            className: `${pfx}__btn`,
            service: "org-setup-done-later",
            uiHandler: [ui],
            kids: [Skeletons.Note({ active: 0, content: say("LATER", "Later") })],
          }),
        ],
      }),
    ],
  });
};
