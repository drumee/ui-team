// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/libs/reader/ticker/skeleton/default
//   TYPE :
// ==================================================================== *


// ===========================================================
// __skl_ticker
//
// @param [Object] view
// @param [Object] name
// @param [Object] label
// @param [Object] ext
// @param [Object] style
//
// @return [Object]
//
// ===========================================================
const __skl_ticker = function(view, name, label, ext, style) {
  const val   = view.get(_a.start) || 0;
  name  = name || view.get(_a.value) || _K.char.empty;
  label = name || view.get(_a.label) || _K.char.empty;
  const pace  = view.get(_a.pace) || 1;

  const ticker = SKL_Box_V(view, {
    className: 'ticker-button__wrapper',
    kidsOpt: {
      service: "tick",
      handler: {
        ui:view
      }
    },
    sys_pn : "ticker",
    kids: [
      SKL_Note("ticker", "&#x25B2;", {className:'ticker-button ticker-decrease', value: +pace}),
      SKL_Note("ticker", "&#x25BC;", {className:'ticker-button ticker-increase', value: -pace})
    ]
  });

  const input = SKL_Entry(view, "10", {
    templateName: _T.wrapper.input_raw,
    className : "editbox-square__input-entry",
    sys_pn    : "input",
    service   : "input",
    signal    : _e.ui.event,
    value     : val,
    handler: {
      ui:view
    }
  });

  const a = SKL_Box_H(view, {
    className   : `editbox-square__input editbox-square__input--${ext}`,
    kids        : [ input, ticker ]
  });

  return a;
};

module.exports = __skl_ticker;
