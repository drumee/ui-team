const { menuInput, entry } = require("../../../../skeleton/toolkit");


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
      Skeletons.UserProfile({ auto_color: 0 }),
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
            content: LOCALE.CHANGE_AVATAR
          }),
        ]
      })
    ]
  });
}

function form(ui) {
  const fig = `${ui.fig.family}__form`;
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
                service: "select-country",
                refAttribute: 'locale_name',
                placeholder: 'Select a country',
                value: "",
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
