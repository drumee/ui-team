// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : builtins/admin/skeleton/locale
//   TYPE : 
// ==================================================================== *



const __devel_icons = function(_ui_, icons) {
  const icon_status_options = {
    width   : 36,
    height  : 26,
    padding : "5px 10px"
  };

  const _normalized = Skeletons.Stream({
    className: `${_ui_.fig.family}__roll u-ai-center`,
    vendorOpt : Preset.List.Orange_e,
    kids      : require('./row-view')(_ui_, icons.normalized),
    sys_pn    : 'normalized'
  });

  const _raw = Skeletons.Stream({
    className: `${_ui_.fig.family}__roll u-ai-center`,
    vendorOpt : Preset.List.Orange_e,
    kids      : require('./row-view')(_ui_, icons.raw),
    sys_pn    : 'raw'
  });
  const a = Skeletons.Box.Y({
    debug : __filename,
    className: `${_ui_.fig.family}__main u-ai-center mt-22 u-jc-center`,
    kids: [
      Skeletons.Box.Y({
        className: "w-100",
        kids: [
          Skeletons.Note({
            content   : "Drumee Icons List",
            className : `${_ui_.fig.family}__title pt-10 pb-30`
          }),
          // Skeletons.Note({
          //   content   : "Search"
          //   className : "#{_ui_.fig.family}__title search pt-10 pb-30"
          // })
          Skeletons.Entry({
            className   : `${_ui_.fig.family}__title search pt-10 pb-30`,
            name        : _e.search,
            service     : _e.search,
            interactive : 1,
            uiHandler   : [_ui_], 
            bubble      : 1,
            placeholder : LOCALE.SEARCH
          })
        ]
      }),
      Skeletons.Box.X({
        className: `${_ui_.fig.family}__content`,
        kids: [
          SKL_Note("show-all", "Normalized icons (without classes)", {
            className: "ml-50 content__label show"
          }),
          SKL_Note("new-entry", "Raw icons (with classes)", {
            className: "ml-50 content__label add"
          })
        ]}),
        
      Skeletons.Box.X({
        className: "w-100",
        kids: [_normalized, _raw]}),

      Skeletons.Wrapper.X({
        ui        : _ui_,
        className : `${_ui_.fig.family}__dialog`
      })
    ]});
  return a;
};
module.exports = __devel_icons;
