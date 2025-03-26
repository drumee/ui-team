// ================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : src/drumee/builtins/window/bigchat/widget/support-ticket-item/skeleton/index.coffee
//   TYPE : Skelton
// ===================================================================**/

// ===========================================================
//
// ===========================================================
const __skl_widget_supportTicket_item = function(_ui_) {
  let chat_icon, chatMessage, displayName, fullname, state, type;
  const contentFig = _ui_.fig.family;

  if (Visitor.get('is_support')) {
    type = _a.support;
    const fname = _ui_.mget(_a.firstname)  || '';
    const lname = _ui_.mget(_a.lastname)  || '';
    fullname = _ui_.mget(_a.fullname) || (fname  + " " + lname);
    displayName = _ui_.mget(_a.surname) || fullname;

    chat_icon = Skeletons.UserProfile({
      className : `${contentFig}__profile`,
      id        : _ui_.mget('entity_id') || _ui_.mget('uid') || _ui_.mget('author_id'),
      firstname : fname || _ui_.mget('display'),
      lastname  : lname,
      fullname,
      online    : _ui_.mget(_a.online)
    });
    
    chatMessage = Skeletons.Note({
      className : `${contentFig}__note message`,
      content   : "#" + _ui_.mget('ticket_id')
    });
  } else {
    type = 'customer';
    displayName = "#" + _ui_.mget('ticket_id');
    chatMessage = '';
    chat_icon = Skeletons.Profile({
      className : `${contentFig}__profile ${type}`,
      id        : _ui_.mget('ticket_id'),
      firstname : 'Support',
      lastname  : 'Ticket',
      fullname  : 'Support Ticket'
    });
  }
  
  const name = Skeletons.Note({
    className : `${contentFig}__note name ${type}`,
    content   :  displayName || _ui_.mget('org_name')
  });

  const chatStatus = Skeletons.Box.X({
    sys_pn    : "chatstatus",
    className : `${contentFig}__note status ${type}`,
    kids: [
      {
        kind      : "status_pill",
        className : `${contentFig}__note status ${type}`,
        status    : _ui_.mget(_a.status),
        type      : _a.ticket
      }
    ]});

  const value = _ui_.mget('room_count') || "";

  if (!~~value) {
    state = _a.closed;
  } else {
    state = _a.open;
  }

  const counterNote = Skeletons.Note({ 
    service    : "counter",
    sys_pn     : "counter",
    className  : `${contentFig}__digit `,
    innerClass : `${contentFig}__btn-counter`,
    content    : value,
    dataset    : { 
      state
    }
  });

  const a = Skeletons.Box.Y({
    className  : `${contentFig}__main`,
    debug      : __filename,
    sys_pn     : 'support-wrapper',
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
          chatStatus
        ]})
    ]});

  return a;
};
module.exports = __skl_widget_supportTicket_item;