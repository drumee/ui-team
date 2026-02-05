
export default function (ui, name) {
  return Skeletons.Box.Y({
    className: `${ui.fig.family}__main`,
    kids: Skeletons.Note({
      className: `${ui.fig.family}__message`,
      content: `The plugin ${decodeURI(name)} is being loaded. Please wait...`
    })
  })
}
