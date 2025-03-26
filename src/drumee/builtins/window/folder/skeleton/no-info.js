const _row = function(_ui_, c1, c2){
  if (c2 == null) { c2 = ""; }
  const cn = "info-item";
  const x1 = Skeletons.Note(c1, cn);
  const x2 = Skeletons.Note(c2, cn);

  const a = Skeletons.Box.X({
    className: "u-jc-sb",
    kids: [ x1, x2]});
  return a; 
};

// ======================================================
// 
// ======================================================
const __folder_info = function(_ui_){
  const a = Skeletons.Box.Y({ 
    debug      : __filename,
    className  : `${_ui_.fig.family}__info-container`, 
    volatility : 2,
    kids       : [
      _row(_ui_, LOCALE.TOTAL_SIZE , LOCALE.NOT_AVAILABLE)//'Total size',  'Not available
    ]});

  const nid = _ui_.mget(_a.parent_id);
  const hub_id = _ui_.mget(_a.hub_id);
  if (nid !== Wm.mget(_a.home_id)) {
    const opt = { 
      content : "...",
      href    : `#/desk/wm/open/nid=${nid}&hub_id=${hub_id}`
    };
    a.kids.push(_row(_ui_, LOCALE.LOCATION, opt));
  }

  return a;
};
module.exports = __folder_info;
