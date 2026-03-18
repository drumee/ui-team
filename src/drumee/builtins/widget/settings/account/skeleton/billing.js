const { filesize } = require("@drumee/server-essentials");

/**
 *
 * @param {*} ui
 * @returns
 */
function filter(ui) {
  const fig = `${ui.fig.family}-storage__filter`;
  return Skeletons.Box.X({
    className: `${fig}-type`,
    kidsOpt: { radio: `filter-${ui._id}`, service: _e.sort, uiHandler: [ui] },
    kids: [
      Skeletons.Element({
        className: `video text`,
        type: _a.video,
        content: LOCALE.VIDEO,
      }),
      Skeletons.Element({
        className: `image text `,
        type: _a.image,
        content: LOCALE.IMAGE,
      }),
      Skeletons.Element({
        className: `document text `,
        type: _a.note,
        content: LOCALE.NOTE,
      }),
      Skeletons.Element({
        className: `all text `,
        type: "*",
        initialState: 1,
        content: LOCALE.ALL_FILES,
      }),
    ],
  });
}

/**
 *
 * @param {*} ui
 * @returns
 */
function header(ui) {
  const fig = `${ui.fig.family}-storage__header`;
  const { storage } = Visitor.quota();
  const use_rate = (100 * Visitor.diskUsed()) / storage;
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
        ],
      }),
      Skeletons.Box.X({
        className: `${fig}-progress-container`,
        kids: [
          Skeletons.Element({
            className: `${fig}-progress-content`,
            style: {
              width: `${use_rate}%`,
            },
          }),
        ],
      }),
      filter(ui),
    ],
  });
}

/**
 *
 * @param {*} ui
 * @param {*} opt
 * @returns
 */
function billing(ui) {
  const fig = `${ui.fig.family}-storage`;
  const list = Skeletons.List.Smart({
    className: `${fig}__list`,
    spinner: Skeletons.Note("", _a.spinner),
    sys_pn: _a.list,
    api: ui.getApi,
    // api: {
    //   service: SERVICE.desk.disk_usage,
    //   hub_id: Visitor.id,
    //   category: '*',
    //   list: 1,
    // },
    itemsOpt: {
      kind: "settings_filename",
      uiHandler: [ui],
    },
  });
  return Skeletons.Wrapper.Y({
    debug: __filename,
    className: `${ui.fig.family}__main`,
    kids: [
      header(ui),
      Skeletons.Element({ className: `${ui.fig.family}__spacer` }),
      list,
    ],
  });
}

export default billing;
