/**
 * 
 * @param {*} _ui_ 
 * @returns 
 */
const __skl_conference_attendee = function(_ui_) {
  const fullname  = _ui_.mget(_a.fullname) || _ui_.mget(_a.username) || _ui_.mget('display');
  const {
    family
  } = _ui_.fig;

  const contact = Skeletons.UserProfile({
    className   : `${family}__profile`,
    id          : _ui_.mget(_a.user_id) || _ui_.mget('drumate_id'),
    fullname,
    online      : _ui_.mget(_a.online),
    live_status : 1,
    sys_pn      : _a.profile
  });
  let service = null;
  if (_ui_.mget(_a.online) === 1) { 
    service = _ui_.mget(_a.service);
  }
  const a = Skeletons.Box.X({
    className  : `${family}__main`,
    debug      : __filename,
    service    : _a.invite,
    kids       : [
      contact,
      Skeletons.Note({
        className  : `${family}__name`,
        content    : fullname
      }),
      Skeletons.Button.Svg({
        ico: "chat_connect",
        className  : `${family}__icon ctrl-line`,
        sys_pn : "ctrl-line",
        state : 0
      })
    ]});

  return a;
};
module.exports = __skl_conference_attendee;
