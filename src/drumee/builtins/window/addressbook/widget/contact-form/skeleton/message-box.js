// ================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : /src/drumee/builtins/window/addressbook/widget/contact-form/skeleton/tags.coffee
//   TYPE : Skelton
// ===================================================================**/

const __skl_addressbook_widget_message_box = function(_ui_) {
  const {
    contact
  } = _ui_;
  const formFig = `${_ui_.fig.family}`;

  const message = Skeletons.Box.X({
    className   : `${formFig}__message-wrapper message form-row no-multiple`,
    kids        : [
      Skeletons.Entry({
        className   : `${formFig}__entry message form-input`, 
        sys_pn      : 'message-input',
        type        : _a.textarea,
        formItem    : 'message',
        placeholder : LOCALE.YOUR_MSG
      })
    ]});
  
  const a = Skeletons.Box.X({
    debug       : __filename,
    className   : `${formFig}__entry-wrapper message-wrapper form-row`,
    kids        : [
      message
    ]});
  
  return a;
};

module.exports = __skl_addressbook_widget_message_box;
