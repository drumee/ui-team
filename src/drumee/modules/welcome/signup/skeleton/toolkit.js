/**
 * 
 * @param {*} ui 
 * @param {*} opt 
 * @returns 
 */
export function button(ui, opt) {
  let { label, ico, service, sys_pn, className, type } = opt;
  const pfx = className || `${ui.fig.family}__button`;
  let kids = []
  if (label) kids.push(
    Skeletons.Element({
      className: `${pfx} btn`,
      content: label,
      tagName: _K.tag.span,
    })
  )
  let main = Skeletons.Box.G;
  if (ico) {
    let el = Skeletons.Button.Svg({
      className: `${pfx} icon`,
      ico,
    })
    if (type === _a.api) {
      kids.unshift(el);
      main = Skeletons.Box.X;
    } else {
      kids.push(el)
      main = Skeletons.Box.G;
    }
  }

  return main({
    className: `${pfx}-main ${type}`,
    partHandler: [ui],
    uiHandler: [ui],
    sys_pn,
    service,
    kidsOpt: {
      active: 0,
    },
    kids
  })
}

/**
 * 
 * @param {*} ui 
 * @returns 
 */
export function header(ui) {
  const fig = ui.fig.family;
  let kids = [
    Skeletons.Box.X({
      className: `${fig}__logo-container`,
      kids: [
        Skeletons.Button.Svg({
          ico: "raw-logo-drumee-icon",
          className: `${fig}__logo-content`,
        })
      ]
    }),


    Skeletons.Box.Y({
      className: `${fig}__text-container`,
      kids: [
        Skeletons.Note({
          className: `${fig}__title`,
          content: LOCALE.JOIN_DRUMEE_FOR_FREE,
        }),
      ]
    })
  ]

  let a = Skeletons.Box.Y({
    className: `${ui.fig.family}__header`,
    debug: __filename,
    kids
  })
  return a;
}

/**
 * 
 * @param {*} ui 
 * @param {*} opt 
 * @returns 
 */
export function entry(ui, opt) {
  let { value, name, placeholder, label, sys_pn, service = _a.input, autocomplete } = opt;
  autocomplete = autocomplete || name;
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
    autocomplete,
    state: 0,
    radio: ui._id
  }
  if (sys_pn) {
    args.sys_pn = sys_pn;
    args.partHandler = [ui];
  }
  return Skeletons.Box.Y({
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
