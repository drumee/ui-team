
function __skl_welcome(_ui_, opt) {

  const a = Skeletons.Box.Y({
    debug: __filename,
    className: `${_ui_.fig.family}__main`,
    kids: [

      require('./topbar').default(_ui_),

      Skeletons.Wrapper.Y({
        className: `${_ui_.fig.family}__modal wrapper`,
        name: 'modal',
      }),

      Skeletons.Box.Y({
        className: `${_ui_.fig.family}__container`,
        kids: [opt]
      }),

    ]
  });

  return a;
};

export default __skl_welcome;
