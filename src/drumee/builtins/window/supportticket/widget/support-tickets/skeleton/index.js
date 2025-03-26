// ================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : /src/drumee/builtins/window/bigchat/widget/chatcontact-list/skeleton/index.coffee
//   TYPE : Skelton
// ===================================================================**/

// ===========================================================
//
// ===========================================================
const __skl_widget_chatcontactList = function(_ui_) {
  
  const headerFig = `${_ui_.fig.family}-header`;
  const tagName = 'Tickets';
  
  const newTicket = Skeletons.Button.Svg({
    ico       : 'desktop_plus',
    className : `${headerFig}-add-menu__icon ${headerFig}-add-menu__trigger trigger-icon ticket_add`,
    service   : 'create-support-ticket',
    uiHandler : _ui_
  });

  const tagHeader = Skeletons.Box.X({
    className : headerFig,
    kids      : [
      Skeletons.Note({
        className   : `${headerFig}__title`,
        content     : tagName
      }),
      
      require('./filter-menu').default(_ui_),
      newTicket
    ]});
  
  const separator = Skeletons.Box.X({
    className : `${_ui_.fig.family}__separator`});

  const ticketWrapper = Skeletons.Box.X({
    className : `${_ui_.fig.family}__tickets-list--wrapper`,
    sys_pn    : 'list-ticket-wrapper',
    kids      : [
      require('./ticket-list').default(_ui_)
    ]});

  const a  = Skeletons.Box.Y({
    className : `${_ui_.fig.family}__tickets`,
    debug     : __filename,
    kids      : [
      tagHeader,
      separator,
      ticketWrapper
    ]});

  return a;
};

module.exports = __skl_widget_chatcontactList;