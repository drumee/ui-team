// ===========================================================
//
// ===========================================================
const __meeting_loading = function(_ui_, label) {
  const a = [
    lense, 
    Skeletons.Box.Y({
      className : `${_ui_.fig.family}__endpoint-local`,
      sys_pn    : "endpoint-local",
      kids:[ local ]}),
    require('./commands')(_ui_)
  ];

  return a;
};
module.exports = __meeting_loading;
