const { colon } = require("core/utils")


const main = function(_ui_) {

  let mobileData = _ui_.data.mobile;
  if (_.isEmpty(mobileData)) {
    mobileData = 'N/A';
  }

  return [
    {
      className : `${_ui_.fig.family}__row`,
      kind      : 'account_input',
      uiHandler : _ui_
    },
    {
      label       : LOCALE.FIRSTNAME + colon(),
      className   : `${_ui_.fig.family}__row editable`,
      name        : _a.firstname,
      placeholder : LOCALE.FIRSTNAME,
      mode        : _e.commit,
      value       : _ui_.data.firstname,
      editable    : 1
    },
    {
      label       : LOCALE.LASTNAME + colon(),
      className   : `${_ui_.fig.family}__row editable`,
      mode        : _e.commit, 
      name        : _a.lastname,
      placeholder : LOCALE.LASTNAME,
      value       : _ui_.data.lastname,
      editable    : 1
    },
    {
      label       : LOCALE.IDENT + colon(),
      className   : `${_ui_.fig.family}__row ident no-editable`,
      name        : _a.ident,
      placeholder : LOCALE.IDENT,
      check       : SERVICE.yp.ident_exists,
      value       : _ui_.data.username,
      service     : _a.ident,
      locked      : 1
    },
    {
      icon        : 'account_mail',
      placeholder : LOCALE.EMAIL,
      className   : `${_ui_.fig.family}__row no-editable`,
      check       : SERVICE.yp.email_exists,
      value       : _ui_.data.email,
      service     : _a.email,
      locked      : 1
    },
    {
      icon        : 'builder_mobile',
      className   : `${_ui_.fig.family}__row no-editable`,
      placeholder : LOCALE.MOBILE_PHONE,
      value       : (_ui_.data.areacode || '') + mobileData,
      service     : _a.mobile,
      locked      : 1
    },
    {
      icon        : 'ab_address',
      placeholder : LOCALE.LOCATION,
      className   : `${_ui_.fig.family}__row editable`,
      value       : _ui_.data.address,
      name        : _a.address,
      editable    : 1
    }
  ];
};


// ----------------------------------------

const __skl_account_profile_form = function(_ui_) {
  const profileFig = _ui_.fig.family;
  
  const a = Skeletons.List.Smart({
    className : `${profileFig}__form`,
    debug     : __filename,
    sys_pn    : _a.list,
    vendorOpt : Preset.List.Orange_e,
    kids      : [
      Skeletons.Box.Y({
        className : `${profileFig}__form-main`,
        kids      : [
          Skeletons.Box.Y({
            className : `${profileFig}__form-content`,
            populate  : main(_ui_)
          })
        ]
      })
    ]});
  
  return  a; 
};

module.exports = __skl_account_profile_form;
