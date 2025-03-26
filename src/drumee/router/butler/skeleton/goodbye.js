const __skl_goodbye = function(_ui_) {
  const goodByeFig = `${_ui_.fig.family}-goodbye`;
  
  const bg = Skeletons.Image.Smart({
    className : `${goodByeFig}__bg`,
    low     : "/-/images/background/welcome-wallpaper.png",
    high    : "/-/images/background/welcome-wallpaper.png"
  });

  const header = Skeletons.Box.X({
    className : `${goodByeFig}__header`,
    kids      : [
      Skeletons.Note({
        className : `${goodByeFig}__note header`,
        content   : LOCALE.GOODBYE_SEE_YOU_LATER
      }) //'You will be disconnected shortly. See you later !'
    ]});
  
  const content = Skeletons.Box.Y({
    className : `${goodByeFig}__container content`,
    sys_pn    : _a.loader,
    kids      : [{kind: 'spinner', mode: 'goodbye-loader'}]});

  const a = Skeletons.Box.Y({
    debug     : __filename,  
    className : `${goodByeFig}__main`,
    kids      : [
      bg,
      header,
      content
    ]});

  return a;
};

module.exports = __skl_goodbye;
