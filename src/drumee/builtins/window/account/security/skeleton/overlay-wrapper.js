function __skl_account_security_overlay_wrapper(_ui_) {
  const overlayFig = `${_ui_.fig.family}-overlay`

  const a = Skeletons.Wrapper.Y({
    debug: __filename,
    className: `${overlayFig}__wrapper`,
    sys_pn: 'overlay-wrapper',
    state: 0,
    dataset: {
      state: _a.closed
    },
    // kids: [
    //   Skeletons.Box.X({
    //     className: 'overlay-content',
    //     kids: []
    //   }),

    //   Skeletons.Wrapper.X({
    //     className: 'overlay-container',
    //     name: 'overlay-container'
    //   })
    // ]
  });

  return a;
};

export default __skl_account_security_overlay_wrapper;
