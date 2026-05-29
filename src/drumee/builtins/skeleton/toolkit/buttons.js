/**
 * 
 * @param {*} ui 
 * @param {*} opt 
 * @returns 
 */
export function button(ui, opt) {
  let {
    label, state = "", ico, service, sys_pn, flow, radiotoggle, dataset,
    className, priority = "primary", type, haptic, radio, value, provider
  } = opt;
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
  let icoPosition = opt.icoPosition || "right";
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
      // Default: use horizontal layout (Box.X) when icon is present
      // Icon position: left (unshift) or right (push)
      if (icoPosition === "left") {
        kids.unshift(el);
      } else {
        // If label exists, icon goes after label; otherwise just icon
        kids.push(el);
      }
      if (flow === 'g') {
        main = Skeletons.Box.G;
      } else {
        main = Skeletons.Box.X;
      }
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
    radiotoggle,
    value,
    provider,
    kidsOpt: {
      active: 0,
    },
    kids,
    dataset
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