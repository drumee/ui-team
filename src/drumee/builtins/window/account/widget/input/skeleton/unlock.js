// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : desk/account/skeleton/modals/modal-account-change-email
//   TYPE : 
// ==================================================================== *

const __unlock = function(_ui_, entries) {
  const pw = Skeletons.Entry({
    uiHandler     : _ui_,
    className : "my-10",
    placeholder: "Enter password",
    name : _a.password,
    type : _a.password,
    require : 'any'
  });

  const a = Skeletons.Box.Y({
    className: "u-ai-center",
    sys_pn: "change-email-modal-box",
    className: `${_ui_.fig.family}__container unlock u-ai-center`,
    kids: [
      Preset.Button.Cross(_ui_, _e.close, `${_ui_.fig.group}-router__close`),
      Skeletons.Note({
        className : `${_ui_.fig.family}__title`,
        content   : "Enter you current pass phrase to unlock security",
        ui_       : _ui_
      }),
      Skeletons.Box.Y({
        className: "u-ai-center",
        sys_pn: "change-email-modal-box",
        kids: [pw]
      }),

      Skeletons.Box.X({
        className: "w-100 my-20 u-jc-sb",
        kids: [
          Skeletons.Note({
            uiHandler     : _ui_,
            content   : LOCALE.CANCEL,
            className : `${_ui_.fig.group}__btn regular`,
            service   : _e.close
          }),
          Skeletons.Note({
            uiHandler     : _ui_,
            content   : LOCALE.SUBMIT, 
            className : `${_ui_.fig.group}__btn`,
            service   : _e.submit
          })
        ]
      })
    ]});

  return a;
};

module.exports = __unlock;
