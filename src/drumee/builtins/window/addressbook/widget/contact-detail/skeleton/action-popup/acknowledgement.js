/*
 * decaffeinate suggestions:
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : /src/drumee/builtins/window/addressbook/widget/contact-detail/skeleton/action-popup/acknowledgement.coffee
//   TYPE : Skeleton
// ===================================================================**/

const __skl_addressbook_widget_acknowledgement = function(_ui_, _content, type) {
  if (type == null) { type = ''; }
  const formFig = `${_ui_.fig.family}__popup`;

  let profileDisplay = '';
  if (type !== _a.invite) {
    profileDisplay = require('./profile-display')(_ui_);
  }

  const title = Skeletons.Note({
    className : `${formFig}_message-info first-node`,
    content   : _content
  });
  
  const button = Skeletons.Note({
    service   : 'close-overlay',
    content   : LOCALE.OK,
    uiHandler : _ui_, 
    className : `${formFig}__button-ok button clickable`
  });

  const a = Skeletons.Box.Y({
    debug       : __filename,
    className   : `${formFig}__delete-acknowledgement`,
    kids        : [
      profileDisplay,
      title
      // button
    ]});
  
  return a;
};

module.exports = __skl_addressbook_widget_acknowledgement;