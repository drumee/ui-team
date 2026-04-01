export function breadcrumbs(ui, opt) {
  return Skeletons.Wrapper.X({
    debug: __filename,
    className: `${ui.fig.group}-breadcrumbs__container`,
    partHandler: ui,
    state: 0
  })
}