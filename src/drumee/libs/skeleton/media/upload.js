const __media_upload = function(view, ext, style) {
  const a = {
    kind     : KIND.list.scroll,
    userClass  : _C.flexgrid,
    collection : _a.media,
    listView   : KIND.media.thread,
    listOpt    : {
      aspect   : _a.grid
    },
    childView  : KIND.media.ui,
    flow       : _a.vertical,
    handler    : {
      ui       : view
    },
    evArgs: {
      content  : LOCALE.NO_CONTENT,
      className : "empty",
      tagName   : _K.tag.div,
      contentClass : _C.margin.auto
    },
    kidsOpt: {
      flow       : _a.vertical,
      format     : _a.vignette,
      skeleton   : require('./icon'),
      handler    : {
        ui       : view
      }
    }
  };
  a.styleOpt = a.styleOpt || {};
  if (_.isObject(ext)) {
    _.extend(a, ext);
  }
  if (_.isObject(style)) {
    _.extend(a.styleOpt, style);
  }
  return a;
};
module.exports = __media_upload;
