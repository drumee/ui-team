// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : builtins/admin/skeleton/locale
//   TYPE : 
// ==================================================================== *



const __devel_icons = function(_ui_) {
  const a = Skeletons.Box.Y({
    debug : __filename,
    className: `${_ui_.fig.family}__main u-ai-center`,
    kids: [
      Skeletons.Box.Y({
        className: "w-100",
        kids: [
          Skeletons.Note({
            content   : "Restart backend",
            service   : _e.restart, 
            className : `${_ui_.fig.family}__title`
          })
        ]
      })
    ]});
  return a;
};
module.exports = __devel_icons;
