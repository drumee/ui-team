// ===========================================================
//
// ===========================================================
const __conference_welcome = function(_ui_, status) {

  const a = Skeletons.Box.X({
    className  : `${_ui_.fig.family}__welcome`,
    kids:[
      Skeletons.Note({
        content   : LOCALE.ENTER_AS_PARTICIPANT,
        className : "button",
        service   : _a.enter,
        status    : 'waiting'
      }),
      Skeletons.Note({
        content   : LOCALE.ENTER_AS_ORGANIZER,
        className : "button",
        service   : _a.enter,
        status    : _e.started
      })
    ]});

  return a;
};
module.exports = __conference_welcome;
