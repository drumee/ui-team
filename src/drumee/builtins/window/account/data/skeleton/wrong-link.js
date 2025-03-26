// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : account/current/profile/skeleton/main.coffee
//   TYPE :
// ==================================================================== *

const __account_footer = function(_ui_, data) {
  const target = data.email.underline("target");
  const current = Visitor.profile().email.underline("current");
  const a = Skeletons.Box.X({
    className: `${_ui_.fig.family}__wrong-link`,
    kids: [
      Skeletons.Note({
        className : `${_ui_.fig.group}__btn ${_ui_.fig.family}__btn`,
        content   : target + LOCALE.WRONG_DELETION_LINK.format(current),
        service   : _e.delete
      })
    ]});
  
  return a;
};

module.exports = __account_footer;
