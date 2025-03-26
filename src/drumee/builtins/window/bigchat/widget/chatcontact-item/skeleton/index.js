
const __skl_widget_chatcontactItem = function(_ui_) {
  let chat_icon, msg, state;
  const contentFig = _ui_.fig.family;

  if (_ui_.mget('flag') === 'contact') {
    //const [ident, domain] = _ui_.mget(_a.email).split('@')
    const fname = _ui_.mget(_a.firstname)  || '';
    const lname = _ui_.mget(_a.lastname)  || '';
    const fullname = _ui_.mget(_a.fullname) || (fname  + " " + lname);

    chat_icon = Skeletons.UserProfile({
      className  : `${contentFig}__profile`,
      id         : _ui_.mget('entity_id'),
      firstname  : fname || _ui_.mget('display'),
      lastname   : lname,
      fullname,
      online     : _ui_.mget(_a.online),
      live_status : 1,
      sys_pn     : _a.profile
    }); 
  } else {
    chat_icon =  Skeletons.Button.Svg({
      ico       : "raw-drumee_projectroom",
      className : `${contentFig}__icon raw-drumee_projectroom`
    });
  }
  
  const name = Skeletons.Note({
    className : `${contentFig}__note name`,
    content   : _ui_.mget('display'),
    escapeContextmenu: true
  }); 
    
  const md = _ui_.mget(_a.metadata);
  if (md && (md.message_type === 'call')) {
    switch (md.call_status) {
      case _e.leave: 
        if(md.role === _a.caller) {
          msg = LOCALE.OUTGOING_CALL;
        } else { 
          msg = LOCALE.INCOMING_CALL;
        }
        break;
      case 'reject': 
        msg = LOCALE.CALL_DECLINED;
        break;
      case _a.cancel:
        msg = LOCALE.MISSED_CALL;
        break;
      default:
        msg = _ui_.mget(_a.message);
    }
  } else {
    msg = _ui_.mget(_a.message);
  }

  if (_.isEmpty(msg) && (_ui_.mget('is_attachment') === 1)) {
    msg = LOCALE.ATTACHMENT;
  }

  const chatMessage = Skeletons.Note({
    className : `${contentFig}__note message`,
    sys_pn    : _a.message,
    content   : msg,
    escapeContextmenu: true
  }); 

  const chatTime = Skeletons.Note({
    className : `${contentFig}__note time`,
    sys_pn    : 'msg-time',
    content   : Dayjs.unix(_ui_.mget(_a.ctime)).locale(Visitor.language()).format("HH:mm")
  });

  const value = _ui_.mget('room_count') || "";

  if (!~~value) {
    state = _a.closed;
  } else {
    state = _a.open;
  }

  const counterNote = Skeletons.Note({ 
    service    : "counter",
    sys_pn     : "counter",
    className  : `${contentFig}__digit`,
    innerClass : `${contentFig}__btn-counter`,
    content    : value,
    dataset    : { 
      state
    }
  });

  const a = Skeletons.Box.Y({
    className  : `${contentFig}__main`,
    debug      : __filename,
    kids       : [
      Skeletons.Box.X({
        className  : `${contentFig}__container`,
        kids : [
          Skeletons.Box.X({
            kids:[
              chat_icon,
              counterNote
            ]}),

          Skeletons.Box.Y({
            className   : `${contentFig}__container`,
            kids        : [
              name,
              chatMessage
            ]}),

          chatTime
        ]})
    ]});

  return a;
};
module.exports = __skl_widget_chatcontactItem;