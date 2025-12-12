/**
 * 
 * @param {*} ui 
 * @param {*} opt 
 * @returns 
 */
export function entry(ui, opt) {
  let { value, name, placeholder = "", label, shower, sys_pn, type, service = _a.input } = opt;
  const pfx = `${ui.fig.family}__entry`;
  let args = {
    className: `${pfx}-input`,
    name,
    value,
    formItem: name,
    innerClass: name,
    mode: _a.interactive,
    service,
    placeholder,
    uiHandler: [ui],
    state: 0,
    type,
    shower,
    radio: ui._id
  }
  if (sys_pn) {
    args.sys_pn = sys_pn;
    args.partHandler = [ui];
  }
  return Skeletons.Box.G({
    className: `${pfx}-main`,
    kids: [
      Skeletons.Note({
        className: `${pfx}-label ${name}`,
        content: label,
      }),
      Skeletons.Entry(args)
    ]
  })
}
/**
 * 
 * @returns 
 */
export function menuInput(ui, opt = {}) {
  const pfx = `${ui.fig.family}`;
  let { className = "" } = opt;
  return {
    ...opt,
    state: 0,
    radio: ui._id,
    name: 'country_code',
    kind: 'menu_input',
    className: `${pfx}__entry-input ${className}`,
    uiHandler: [ui]
  }
}

/**
 * 
 * @param {*} ui 
 * @param {*} opt 
 * @returns 
 */
export function user_form(ui, opt) {
  const pfx = `${ui.fig.family}__user-form`;
  let data = ui._saved_data[ui._step] || {}
  let { firstname, lastname, email, country_code } = data;
  return Skeletons.Box.G({
    className: `${pfx}-main`,
    kids: [
      Skeletons.Box.G({
        className: `${pfx}-row`,
        kids: [
          entry(ui, {
            label: LOCALE.FIRSTNAME,
            name: _a.firstname,
            placeholder: "Alice",
            value: firstname
          }),
          entry(ui, {
            label: LOCALE.LASTNAME,
            name: _a.lastname,
            placeholder: "Borderland",
            value: lastname,
          })
        ]
      }),
      Skeletons.Box.G({
        className: `${pfx}-row`,
        kids: [
          entry(ui, {
            label: LOCALE.EMAIL,
            name: _a.email,
            value: email,
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
                name: 'country_code',
                service: "select-country",
                refAttribute: 'locale_name',
                placeholder: 'Select a country',
                value: country_code,
              }),
            ]
          })
        ]
      }),
    ]
  })
}