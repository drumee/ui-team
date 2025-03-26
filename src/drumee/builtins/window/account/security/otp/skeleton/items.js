
/**
 * 
 * @param {*} _ui_ 
 * @param {*} method 
 * @returns 
 */
function check(_ui_, method) {
  let prefix = _ui_.fig.family;
  let verified;
  switch (method) {
    case _a.email:
      verified = Visitor.profile().email_verified === _a.yes;
      content = LOCALE.EMAIL;
      break;
    case _a.sms:
      verified = /[0-9]+/.test(Visitor.profile().mobile)
      content = "SMS";
      break;
    case "passkey":
      verified = false;
      content = LOCALE.PASSKEY;
      break;
  }
  let state = 0;
  if (verified) {
    state = 1;
  }
  let status = Skeletons.Button.Svg({
    className: `${prefix}__checkbox`,
    state,
    sys_pn: "checkbox",
    icons: [
      "box-tags",
      "backoffice_checkboxfill"
    ]
  });

  let title = Skeletons.Note({
    className: `${prefix}__status`,
    content
  })
  return Skeletons.Box.X({
    className: `${prefix}__selector`,
    kids: [title, status]
  })
}

/**
 * 
 * @param {*} _ui_ 
 * @returns 
 */
const slkOtp = function (_ui_) {
  let items = [];
  for (let m of Platform.get('TfaMethods')) {
    items.push(check(_ui_, m))
  }
  return items
};

module.exports = slkOtp;
