
module.exports = function (ui) {
  return Skeletons.Box.Y(ui, {
    className: `${ui.fig.family}`,
    kids: Skeletons.Note("This is your Drumee plugin")
  })
}
