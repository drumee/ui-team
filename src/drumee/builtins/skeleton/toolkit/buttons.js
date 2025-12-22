/**
 * 
 * @param {*} ui 
 * @param {*} opt 
 * @returns 
 */
export function button(ui, opt) {
  let { label, state = "", ico, service, sys_pn, className, priority = "primary", type, haptic } = opt;
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
  }
  return main({
    className: `${pfx}-main ${priority}`,
    partHandler: [ui],
    uiHandler: [ui],
    sys_pn,
    state,
    service,
    haptic,
    kidsOpt: {
      active: 0,
    },
    kids
  })
}
