const { filesize } = require("@drumee/ui-essentials");

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
  // See settings/account/skeleton/storage.js: the allowance arrives as `disk`
  // from the get_quota FUNCTION and only as `storage` from the procedure, so
  // read whichever this deployment sends.
  const q = Visitor.quota() || {};
  const storage = q.storage != null ? q.storage : q.disk;
  // Unlimited entitlement (claim-reward prize). Same treatment as
  // settings/account/skeleton/storage.js: $.disk holds the BIGINT sentinel so
  // arithmetic stays safe, but showing it renders "9.22 EB" next to a bar
  // frozen at 0%.
  const unlimited = q.unlimited === true || q.unlimited === 1 || q.unlimited === "1";
  const use_rate = !unlimited && storage ? (100 * Visitor.diskUsed()) / storage : 0;
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
            content: unlimited
              ? `/${LOCALE.UNLIMITED || "Unlimited"}`
              : `/${filesize(storage)}`,
          }),
          Skeletons.Element({
            className: `upgrade text `,
            service: "upgrade-plan",
            content: LOCALE.UPGRADE_PLAN,
          }),
        ],
      }),
      // Dropped on an unlimited entitlement: a share-of-allowance bar has no
      // allowance to divide by, and 0% forever reads as broken.
      ...(unlimited ? [] : [Skeletons.Box.X({
        className: `${fig}-progress-container`,
        kids: [
          Skeletons.Element({
            className: `${fig}-progress-content`,
            style: {
              width: `${use_rate}%`,
            },
          }),
        ],
      })]),
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
