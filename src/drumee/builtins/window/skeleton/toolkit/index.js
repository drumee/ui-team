export function breadcrumbs(ui, opt) {
  return Skeletons.Wrapper.X({
    debug: __filename,
    className: `${ui.fig.group}-breadcrumbs__container`,
    sys_pn: "breadcrumbs-roll",
    partHandler: ui,
    state: 0
  })
}