function __skl_dmz_sharebox(_ui_) {
  const shareboxFig = _ui_.fig.family;

  const topNav = Skeletons.Box.X({
    className: `${shareboxFig}__top-nav`,
    sys_pn: "top-nav",
  });

  const header = Skeletons.Box.X({
    className: `${shareboxFig}__page-header`,
    sys_pn: _a.header,
  });

  const content = Skeletons.Box.X({
    className: `${shareboxFig}__content`,
    sys_pn: _a.content,
  });

  const footer = Skeletons.Wrapper.X({
    className: `${shareboxFig}__footer`,
    sys_pn: _a.footer,
    dataset: {
      mode: _a.closed,
    },
  });

  const signupOverlay = Skeletons.Box.Z({
    className : `${shareboxFig}__signup-overlay`,
    sys_pn    : 'signup-overlay',
    dataset   : { mode: _a.closed },
  });

  return Skeletons.Box.Y({
    className: `${shareboxFig}__main`,
    debug: __filename,
    kids: [
      Skeletons.Box.Y({
        className: `${shareboxFig}__container`,
        kids: [topNav, header, content, footer],
      }),
      signupOverlay,
    ],
  });
}

export default __skl_dmz_sharebox;
