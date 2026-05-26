function __skl_welcome_signin(_ui_, opt, type = "") {
  const fig = _ui_.fig.family;
  let dataset = _ui_.mget(_a.dataset) || {};
  const logo = Skeletons.Box.X({
    active: 0,
    className: `${fig}__logo-content`,
    kids: [
      Skeletons.Button.Svg({
        ico: "raw-logo-drumee-full",
        className: `${fig}__logo-icon`,
      }),
    ],
  });
  let a = Skeletons.Box.Y({
    className: `${fig}__main`,
    debug: __filename,
    kids: [
      Skeletons.Box.Y({
        className: `${fig}__container`,
        dataset,
        kids: [
          logo,
          Skeletons.Box.Y({
            className: `${fig}__header`,
            sys_pn: _a.header,
            dataset,
            kids: [opt.header],
          }),
          Skeletons.Box.Y({
            className: `${fig}__content ${type}`,
            sys_pn: _a.content,
            kids: [opt.content],
          }),
        ],
      }),
    ],
  });

  return a;
}

module.exports = __skl_welcome_signin;
