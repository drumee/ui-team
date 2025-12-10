const { filesize } = require("core/utils");

/**
 * 
 * @param {*} ui 
 * @returns 
 */
function filter(ui) {
  const fig = `${ui.fig.family}-storage__filter`;
  return Skeletons.Box.X({
    className: `${fig}-type`,
    kidOpts: { radio: `filter-${ui._id}` },
    kids: [
      Skeletons.Element({
        className: `video text`,
        content: LOCALE.VIDEO,
      }),
      Skeletons.Element({
        className: `image text `,
        content: LOCALE.IMAGE,
      }),
      Skeletons.Element({
        className: `document text `,
        content: LOCALE.DOCUMENT,
      }),
    ]
  })
}

/**
 * 
 * @param {*} ui 
 * @returns 
 */
function header(ui) {
  const fig = `${ui.fig.family}-storage__header`;
  const { storage } = Visitor.quota();
  return Skeletons.Box.Y({
    className: `${fig}-content`,
    kids: [
      Skeletons.Element({
        className: `${fig}-subtitle`,
        content: LOCALE.YOU_USED,
      }),
      Skeletons.Box.X({
        className: `${fig}-usage`,
        kids: [
          Skeletons.Element({
            className: `used text`,
            content: filesize(Visitor.diskUsed()),
          }),
          Skeletons.Element({
            className: `available text `,
            content: `/${filesize(storage)}`,
          }),
          Skeletons.Element({
            className: `upgrade text `,
            service: "upgrade-plan",
            content: LOCALE.UPGRADE_PLAN,
          }),
        ]
      }),
      Skeletons.Element({ className: `${ui.fig.family}__progress` }),
      filter(ui),
    ]
  })
}


/**
 *
 * @param {*} ui
 * @param {*} opt
 * @returns
 */
function storage(ui) {
  const fig = `${ui.fig.family}-storage`;
  const list = Skeletons.List.Smart({
    className: `${fig}__list`,
    spinner: Skeletons.Note("", _a.spinner),
    sys_pn: _a.list,
    api: {
      service: SERVICE.desk.disk_usage,
      hub_id: Visitor.id,
      category: '*',
      list: 1,
    },
    itemsOpt: {
      kind: 'settings_filename',
      uiHandler: [ui],
    },
  });
  return Skeletons.Wrapper.Y({
    debug: __filename,
    className: `${ui.fig.family}__main`,
    kids: [
      header(ui),
      Skeletons.Element({ className: `${ui.fig.family}__spacer` }),
      list
    ]
  });

}

export default storage;
