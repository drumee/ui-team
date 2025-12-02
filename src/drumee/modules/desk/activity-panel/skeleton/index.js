module.exports = function (ui) {
  const fig = `${ui.fig.family}`;
  const header = Skeletons.Box.X({
    className: `${fig}__header`,
    kids: [
      Skeletons.Note({
        className: `${fig}__title`,
        content: LOCALE.ACTIVITY
      }),
      Skeletons.Note({
        className: `${fig}__action`,
        content: LOCALE.MARK_ALL_READ
      }),
    ],
  });

  const list = Skeletons.List.Smart({
    className: `${fig}__list`,
    spinner: Skeletons.Note("", _a.spinner),
    sys_pn: _a.list,
    api: {
      service: SERVICE.activity.get_feed,
      hub_id: Visitor.id
    },
    itemsOpt: {
      kind: 'activity_item',
      uiHandler: [ui],
    },
  });

  return Skeletons.Wrapper.Y({
    debug: __filename,
    className: `${ui.fig.family}__main`,
    kids: [
      header,
      list
    ]
  });

};
