// ===========================================================
//
// ===========================================================
const __screenshare_loading = function(_ui_, data, service) {
  const a = Skeletons.Box.Y({
    debug       : __filename,
    className   : `${_ui_.fig.family}__main`, 
    sys_pn      : _a.content,
    kids        : [
      require('builtins/webrtc/skeleton/local-display')(_ui_, data, service)
    ]});    
  return a;
};
module.exports = __screenshare_loading;
