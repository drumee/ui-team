const __media_progress = function(_ui_, loader, ext) {
  const target = {
    kind       : KIND.progress,
    debug      : __filename,
    className  : "fill-up",
    name       : _ui_.mget(_a.filename),
    loader,
    handler    : {
      uiHandler    : _ui_
    }
  };
  if (_.isObject(ext)) {
    _.extend(target, ext);
  }
  return target;
};
module.exports = __media_progress;
