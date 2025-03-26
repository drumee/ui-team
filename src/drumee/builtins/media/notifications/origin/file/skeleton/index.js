const __skl_notification_file = function(_ui_) {
  let p = _ui_.mget(_a.preview);
  p = p.split('/');
  const filename = p.pop();
  const hub_id = _ui_.mget(_a.hub_id);
  const nid = _ui_.mget(_a.nid);
  _ui_.mset({filename});
  const a = Skeletons.Box.X({
    className  : `${_ui_.fig.family}__main`,
    debug      : __filename,
    service    : 'new-media',
    kids       : [
      Skeletons.Note({
        className  : `${_ui_.fig.family}__filename`,
        content    : filename,
        title      : _ui_.mget(_a.preview),
        active     : 0
      })
    ]});

  return a;
};
module.exports = __skl_notification_file;