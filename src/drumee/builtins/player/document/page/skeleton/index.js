const __player_page = function(_ui_) {
  const canvas = Skeletons.Element({
    tagName : 'canvas',
    sys_pn  : 'canvas',
    attrOpt   : {
      id : `${_ui_._id}-canvas`
    }
  });
  const textLayer = Skeletons.Element({
    className :`${_ui_.fig.family}__text-layer textLayer`,
    sys_pn  : 'text-layer',
    attrOpt   : {
      id : `${_ui_._id}-text-layer`
    }
  });
  const a = Skeletons.Box.Y({
    className :`${_ui_.fig.family}__canvas-wrapper`,
    sys_pn  : "canvas-wrapper",
    kids : [canvas]});

  return a;
};
module.exports = __player_page;
