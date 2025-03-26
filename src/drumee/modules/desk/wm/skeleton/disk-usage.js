// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : src/drumee/builtins/desk/skeleton/window 
//   TYPE : 
// ==================================================================== *


const __properties = function (_ui_, text) {
  const fig = `${_ui_.fig.family}__disk`

  const a = Skeletons.Box.Y({
    debug: __filename,
    className: `${fig}-main`,
    kids: [
      Preset.Button.Close(_ui_, 'close-alert'),
      Skeletons.Box.Y({
        className: `${fig}-content`,
        kids: [{
          kind: 'disk_usage',
          /* To use fresh data - otherwise Visitor.get('disk') */
          /* update : 1 */ 
        }]
      })
    ]
  });

  return a;
};

module.exports = __properties;
