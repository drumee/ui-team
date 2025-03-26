// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : src/drumee/builtins/window/channel/
//   TYPE : Skelton
// ==================================================================== *

const __skl_channel_media_wrapper = function (_ui_) {

  const a = Skeletons.List.Smart({
    debug: __filename,
    className: "u-ai-center",
    flow: _a.none,
    axis: _a.x,
    sys_pn: "content",
    evArgs: Skeletons.Element(),
    kids: _ui_.mget(_a.items),
    styleOpt: {
      height: 100
    }
  });
  return a;
};
module.exports = __skl_channel_media_wrapper;