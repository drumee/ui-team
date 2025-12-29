/**
 * 
 * @param {*} ui 
 * @param {*} opt 
 * @returns 
 */
export function button(ui, opt) {
  let { label, state = "", ico, service, sys_pn, className, priority = "primary", type, haptic, radio, value } = opt;
  const pfx = className || `${ui.fig.group}__button`;
  let kids = []
  if (label) kids.push(
    Skeletons.Element({
      className: `${pfx} btn`,
      content: label,
      tagName: _K.tag.span,
    })
  )
  let main = Skeletons.Box.G;
  let no_icon = ""
  if (ico) {
    let el = Skeletons.Button.Svg({
      className: `${pfx} icon`,
      ico,
    })
    if ([_a.api].includes(type)) {
      kids.unshift(el);
      main = Skeletons.Box.X;
    } else if ([_a.row].includes(type)) {
      kids.push(el)
      main = Skeletons.Box.X;
    } else {
      kids.push(el)
      main = Skeletons.Box.G;
    }
  } else {
    no_icon = 'no-icon'
  }
  return main({
    className: `${pfx}-main ${priority} ${no_icon}`,
    partHandler: [ui],
    uiHandler: [ui],
    sys_pn,
    state,
    service,
    haptic,
    radio,
    value,
    kidsOpt: {
      active: 0,
    },
    kids
  })
}


export function confirm_buttons(ui, opt, b1, b2) {
  const fig = ui.fig.family;
  return Skeletons.Box.X({
    className: `${fig}__buttons`,
    uiHandler: [ui],
    dataset: { page: ui._page },
    ...opt,
    kids: [
      button(ui, {
        label: LOCALE.CANCEL,
        type: _a.toggle,
        className: `${fig}__button`,
        service: _e.cancel,
        priority: "secondary",
        state: 1,
        ...b1
      }),
      button(ui, {
        label: LOCALE.SUBMIT,
        type: _a.toggle,
        service: _e.submit,
        className: `${fig}__button`,
        priority: "primary",
        state: 1,
        ...b2
      })
    ],
  });
}