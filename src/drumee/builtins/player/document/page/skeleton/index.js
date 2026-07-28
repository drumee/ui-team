const __player_page = function(_ui_) {
  const pfx = _ui_.fig.family;
  const canvas = Skeletons.Element({
    tagName : 'canvas',
    sys_pn  : 'canvas',
    attrOpt   : {
      id : `${_ui_._id}-canvas`
    }
  });

  // Pointer surface for selection: covers the rendered page box exactly, since
  // page coordinates come from its bounding rect. The highlight rects are NOT its
  // children — they live in `selection-rects`, which is laid out in unrotated page
  // space and rotated as a whole so PDFium's rects can be used as-is.
  const selection = Skeletons.Element({
    className : `${pfx}__selection`,
    sys_pn    : 'selection',
    attrOpt   : {
      id : `${_ui_._id}-selection`
    }
  });
  const rects = Skeletons.Element({
    className : `${pfx}__selection-rects`,
    sys_pn    : 'selection-rects',
    attrOpt   : {
      id : `${_ui_._id}-selection-rects`
    }
  });

  const a = Skeletons.Box.Y({
    className :`${pfx}__canvas-wrapper`,
    sys_pn  : "canvas-wrapper",
    kids : [canvas, selection, rects]});

  return a;
};
module.exports = __player_page;
