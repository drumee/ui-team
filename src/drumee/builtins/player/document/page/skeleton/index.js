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
  // The text layer must be mounted alongside the canvas, not merely built: the
  // canvas is a bitmap with no text nodes in it, so this overlay is the only
  // thing that makes the page selectable/copyable. It is filled in by the
  // widget's _buildTextLayer once the raster size is known.
  const a = Skeletons.Box.Y({
    className :`${_ui_.fig.family}__canvas-wrapper`,
    sys_pn  : "canvas-wrapper",
    kids : [canvas, textLayer]});

  return a;
};
module.exports = __player_page;
