/**
 * 
 * @param {*} ui 
 * @param {*} opt 
 * @returns 
 */
export function entry(ui, opt) {
  let {
    value, name, placeholder = "", label, shower, sys_pn, type,
    service = _a.input, ico, icoPosition = "right", readonly, interactive,
    watch
  } = opt;
  const pfx = `${ui.fig.family}__entry`;
  // Build className with readonly modifier if needed
  let inputClassName = `${pfx}-input`;
  if (readonly) {
    inputClassName += ` ${pfx}-input--readonly`;
  }

  let args = {
    className: inputClassName,
    name,
    value,
    formItem: name,
    innerClass: name,
    mode: interactive === 0 ? _a.commit : _a.interactive,
    service,
    placeholder,
    uiHandler: [ui],
    state: 0,
    type,
    shower,
    watch,
    radio: ui._id
  }

  // Add readonly and interactive if provided
  if (readonly !== undefined) {
    args.readonly = readonly;
  }

  if (interactive !== undefined) {
    args.interactive = interactive;
  }

  if (sys_pn) {
    args.sys_pn = sys_pn;
    args.partHandler = [ui];
  }

  // Create entry component
  let entryComponent = Skeletons.Entry(args);

  // If icon is provided, wrap entry in Box.X and add icon to place it inside border
  if (ico) {
    const iconComponent = Skeletons.Button.Icon({
      className: `${pfx}-icon`,
      ico: ico,
      state: 0,
    });

    // Build wrapper className with readonly modifier if needed
    let wrapperClassName = `${pfx}-input-wrapper`;
    if (readonly) {
      wrapperClassName += ` ${pfx}-input-wrapper--readonly`;
    }

    // Wrap entry in Box.X to contain icon inside border
    entryComponent = Skeletons.Box.X({
      className: wrapperClassName,
      kids: [entryComponent]
    });

    // Add icon to the correct position (left or right)
    if (icoPosition === "left") {
      entryComponent.kids.unshift(iconComponent);  // Add icon at the beginning
    } else {
      entryComponent.kids.push(iconComponent);    // Add icon at the end (default)
    }
  }

  // Build main className with readonly modifier if needed
  let mainClassName = `${pfx}-main`;
  if (readonly) {
    mainClassName += ` ${pfx}-main--readonly`;
  }

  return Skeletons.Box.G({
    className: mainClassName,
    kids: [
      Skeletons.Note({
        className: `${pfx}-label ${name}`,
        content: label,
      }),
      entryComponent
    ]
  })
}
/**
 * 
 * @returns 
 */
export function menuInput(ui, opt = {}) {
  const pfx = `${ui.fig.family}`;
  let { className = "", name = opt.name || 'country_code' } = opt;
  return {
    ...opt,
    state: 0,
    radio: ui._id,
    name: name,
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

