// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : desk/account/skeleton/modals/modal-account-change-email
//   TYPE : 
// ==================================================================== *

const __unlock_email = function(_ui_) {

  const a = [
    Skeletons.Entry({
      uiHandler     : _ui_,
      className : "unlock-entry mb-10",
      placeholder: "Enter password",
      name : _a.password,
      type : _a.password,
      require : 'any'
    }),
    Skeletons.Entry({
      uiHandler     : _ui_,
      className : "unlock-entry mb-10",
      placeholder: "New email address",
      name    : _a.email,
      require : _a.email
    }),
    Skeletons.Entry({
      uiHandler       : _ui_,
      className   : "unlock-entry",
      placeholder : "Repeat new email address",
      name        : 'confirmEmail',
      require     : _a.email
    })
  ];

  return a;
};

module.exports = __unlock_email;
