
// -----------------------------------------
const slkOtp = function (_ui_, args ) {
  let uiHandler = _ui_;
  let prefix = _ui_.fig.group;
  let title = Skeletons.Note({
    className: `${prefix}__status`,
    content: LOCALE.EMAIL
  })
  let status;
  let {verified, label} = args;
  if (verified) {
    status = Skeletons.Button.Svg({
      ico: "desktop_check",
      className: `${prefix}__icon`
    });
  } else {
    status = Skeletons.Note({
      className: `${prefix}__button btn--go`,
      content: label,
      uiHandler,
      service : "register"
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
