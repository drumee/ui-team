// ==================================================================== *
//   Copyright Xialia.com  2011-2021
//   FILE : src/drumee/builtins/desk/skeleton/common/topbar/settings
//   TYPE : Skeleton
// ==================================================================== *

const __desk_top_bar_settings = function(_ui_) {
  const pfx = `${_ui_.fig.group}-topbar__item-settings`;
  const a = Skeletons.Box.X({
    className : "u-ai-center u-jc-sb",
    debug     : __filename,
    persistence: _a.once,
    debug     : __filename,
    kids      : [
      Skeletons.Button.Label({
        ico : "desktop_copy",
        label: LOCALE.COPY,
        className: `${pfx} copy green`,
        service: _e.copy
      }),

      Skeletons.Button.Label({
        ico : "desktop_paste",
        label: LOCALE.PASTE,
        className: `${pfx} paste blue big`,
        service: _e.paste
      }),

      Skeletons.Button.Label({
        ico : "desktop_upload",
        label     : LOCALE.UPLOAD,
        className : `${pfx} upload green-dark big`,
        service   : _e.upload
      }),

      Skeletons.Button.Label({
        ico : "desktop_download",
        label     : LOCALE.DOWNLOAD,
        className : `${pfx} download blue-dark big`,
        service   : _e.download
      }),

      Skeletons.Button.Label({ 
        ico       : "protected-lock",
        label     : LOCALE.PROTECTED,
        className : `${pfx} protected big`,
        service   : _e.lock,
        sys_pn    : 'top-protected-btn'
      })
    ]});
  
  return a;
};

module.exports = __desk_top_bar_settings;