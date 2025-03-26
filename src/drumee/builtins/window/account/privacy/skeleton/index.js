// ==================================================================== *
//   Copyright Xialia.com  2011-2022
//   FILE : /src/drumee/builtins/window/account/privacy/skeleton/index.coffee
//   TYPE : Skeleton
// ==================================================================== *

const _row = function(...args) {
  const r = { 
    kind       : 'privacy_switcher',
    labels     : _.take(args, 3),
    name       : args[3],
    multi_line : args[5]
  };
  return r; 
};

const __account_privacy = function(_ui_) {

  const a = Skeletons.Box.Y({
    className : `${_ui_.fig.family}__main`,
    debug     : __filename,
    kids      : [
      _row(
        LOCALE.CONNECTION_DATES_AND_PLACES,
        LOCALE.DISABLED,
        LOCALE.ENABLED, 
        _a.log,
        Visitor.get('privacy')[_a.log]
      )
    ]});
  return a; 
};

module.exports = __account_privacy;
