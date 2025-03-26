const __skl_hello = function(view) {
  const a = { 
    kind: KIND.box,
    flow: _a.vertical,
    className: 'u-jc-center u-ai-center welcome',
    styleOpt: {
      width: _K.size.full,
      height: _K.size.full,
      'min-height': '100vh',
      'min-width' : '100vw',
      background: '#ffffff'
    },
    kids: [
      SKL_Note(null, LOCALE.WELCOME_BACK, {className:'welcome__header1'}),
      SKL_Note(null, LOCALE.YOU_WILL_BE_ONLINE, {className:'welcome__header2 mt-16'}),
      SKL_SVG('welcome', {className:'welcome__icon mt-30'}, {
        width: 475,
        height: 354,
        padding: 0
      })
    ]
  };

  return a;
};
module.exports = __skl_hello;
