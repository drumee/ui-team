// ==================================================================== *
//   Copyright Xialia.com  2011-2022
//   FILE : /ui/src/drumee/api/lib/popup/skeleton/index.coffee
//   TYPE : Skeleton
// ==================================================================== *

const __welcome_default = function(_ui_) {

  const body  = Skeletons.Box.X({ 
    className : `${_ui_.fig.family}__entry-container`,
    sys_pn    : "body-container",
    kids      : [
      _ui_._label ?
        Skeletons.Note({
          className : `${_ui_.fig.family}__popbutton ${_ui_.mget('btn-class')}`,
          content   : _ui_._label,
          service   : 'open-popup',
          styleOpt  : {
            background  : _ui_._btnColor
          }
        }) : undefined,

      Skeletons.Wrapper.Y({
        className : `${_ui_.fig.family}__overlay`,
        name      : "overlay"
      })
    ]});

  const a = Skeletons.Box.Y({
    debug     : __filename,  
    className : `${_ui_.fig.family}__main`,
    kids      : [body]});
  
  return a;
};

module.exports = __welcome_default;
