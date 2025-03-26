const __welcome_signup_validation = function(_ui_) {
  const data = _ui_._data;
  const conditions = Skeletons.Box.X({ 
    className : `${_ui_.fig.family}__row conditions`,
    sys_pn    : "wrapper-email",
    kids : [    
      Skeletons.Button.Svg({
        ico       : "account_check",
        state     : 0,
        name      : _a.check,
        service   : _a.check,
        reference : _a.state,
        className : `${_ui_.fig.family}__icon checkbox`
      }),
      Skeletons.Note({
        className : `${_ui_.fig.family}__acknowledge conditions`,
        content   : LOCALE.ACCEPT_GENERAL_TERMS_USE
      }) 

    ]});

  let welcomeText = Skeletons.Note({
    className : `${_ui_.fig.family}__acknowledge title signup`,
    content   : `<p>${LOCALE.WELCOME_PRIVATE_OFFICE}</p><p>${LOCALE.CREATE_YOUR_PASSWORD}</p>`
  });
    
  if (data.inviter_email) {
    welcomeText = Skeletons.Note({
      className : `${_ui_.fig.family}__acknowledge title invitation}`,
      content   : `
      <p class='inviter-text'>
        <span>${LOCALE.INVITATION_SIGNUP_WELCOME_TEXT}</span> 
        <span>${data.inviter_email}</span>
      </p>
    `
  })

  return Skeletons.Box.Y({
    className : `${_ui_.fig.family}__main--container validate`,
    debug     : __filename ,
    kids : [
      Preset.Button.Close(_ui_),
      welcomeText,
      Skeletons.Box.X({
        className : `${_ui_.fig.family}__row small`,
        kids:[
          require('../../skeleton/password')(_ui_, `${_ui_.fig.family}__row`, 1)
        ]
      }),
      conditions,
      Skeletons.Box.X({
        className : `${_ui_.fig.family}__row`,
        kids:[
          require('../../skeleton/submit')(_ui_, `${_ui_.fig.family}__go big`, `set-pass-phrase`)
        ]
      })
    ]
  })
};

module.exports = __welcome_signup_validation;
