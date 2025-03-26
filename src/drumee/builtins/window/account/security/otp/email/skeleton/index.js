
// -----------------------------------------
const slkOtp = function (_ui_) {
  let uiHandler = _ui_;
  let prefix = _ui_.fig.group;
  let { email_verified } = Visitor.profile();

  let title = Skeletons.Note({
    className: `${prefix}__title`,
    content: LOCALE.EMAIL
  })
  let status;
  if (email_verified) {
    status = Skeletons.Button.Svg({
      ico: "desktop_check",
      className: `${prefix}__icon`
    });
  } else {
    status = Skeletons.Note({
      className: `${prefix}-${pfx}__button btn--go`,
      content: LOCALE.CHECK,
      uiHandler,
    })
  }
  return Skeletons.Box.Y({
    className: `${prefix}__main`,
    debug: __filename,
    kids: [
      Skeletons.Box.X({
        className: `${prefix}__content`,
        kids: [title, status]
      })
    ]
  });

};

module.exports = slkOtp;
