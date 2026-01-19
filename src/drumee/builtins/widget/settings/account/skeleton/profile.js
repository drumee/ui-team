const { menuInput, entry } = require("../../../../skeleton/toolkit");
const emojiFlags = require('emoji-flags');

/**
 * 
 * @param {*} ui 
 * @returns 
 */
function user(ui) {
  const fig = `${ui.fig.family}__avatar`;
  return Skeletons.Box.G({
    className: `${fig}-main`,
    kids: [
      { kind: "avatar", sys_pn: "avatar-widget", className: `${fig}-avatar` },
      Skeletons.UserProfile({ auto_color: 0, sys_pn: "user-profile" }),
      Skeletons.Box.Y({
        className: `${fig}-details`,
        kids: [
          Skeletons.Element({
            className: `${fig}-username item`,
            content: Visitor.fullname(),
          }),
          Skeletons.Element({
            className: `${fig}-email item`,
            content: Visitor.profile().email,
          }),
          Skeletons.Element({
            className: `${fig}-change item`,
            service: "upload-avatar",
            content: LOCALE.CHANGE_AVATAR
          }),
        ]
      }),
      Skeletons.Element({ className: `${ui.fig.family}__avatar-progress`, sys_pn: "avatar-progress" }),
    ]
  });
}

function form(ui) {
  const fig = `${ui.fig.family}__form`;
  let items = []
  for (let k of _.keys(emojiFlags)) {
    if (/[A-Z]{2,2}/.test(k)) {
      let { name: locale_name, emoji } = emojiFlags.countryCode(k) || {}
      items.push({ country_code: k, value: k, emoji, label: locale_name, locale_name })
    }
  }
  return Skeletons.Box.Y({
    className: `${fig}-main`,
    kids: [
      Skeletons.Box.G({
        className: `${fig}-row name`,
        kids: [
          entry(ui, {
            label: LOCALE.FIRSTNAME,
            name: _a.firstname,
            placeholder: "",
            value: Visitor.profile().firstname
          }),
          entry(ui, {
            label: LOCALE.LASTNAME,
            name: _a.lastname,
            placeholder: "",
            value: Visitor.profile().lastname,
          })
        ]
      }),
      Skeletons.Box.G({
        className: `${fig}-row`,
        kids: [
          entry(ui, {
            label: LOCALE.EMAIL,
            name: _a.email,
            value: Visitor.profile().email,
            placeholder: "i@example.org"
          }),
          Skeletons.Note({
            sys_pn: "error",
            className: `${fig}-error`,
            state: 0,
            content: ""
          }),
          Skeletons.Box.G({
            className: `${ui.fig.family}__entry-main`,
            kids: [
              Skeletons.Note({
                className: `${ui.fig.family}__entry-label country`,
                content: LOCALE.COUNTRY,
              }),
              menuInput(ui, {
                className: `${ui.fig.family}__country-input`,
                name: 'country_code',
                items,
                service: "select-country",
                placeholder: 'Select a country',
                value: Visitor.profile().country_code,
              }),
            ]
          })
        ]
      }),
    ]
  })
}

/**
 *
 * @param {*} ui
 * @param {*} opt
 * @returns
 */
function settings_body(ui) {
  return [
    user(ui),
    Skeletons.Element({ className: `${ui.fig.family}__spacer` }),
    form(ui)
  ];
}

export default settings_body;
