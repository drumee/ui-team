
export default function (ui) {
  let kids = Skeletons.Note({
    className: `${ui.fig.family}__counter`,
    sys_pn: ui.counter_id,
    content: "00:00"
  })
  if (ui.mget(_a.content)) {
    kids = ui.mget(_a.content)
  }
  return Skeletons.Box.Y({
    className: `${ui.fig.family}__main`,
    debug: __filename,
    kids: [
      Skeletons.Box.X({
        className: `${ui.fig.family}__container`,
        kids
      })
    ]
  })
}
