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
        type: '*',
        initialState: 1,
        content: LOCALE.ALL_FILES,
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
  // `storage` is the alias; `disk` is the key the quota row is actually stored
  // under. desk.get_env is fed by the get_quota FUNCTION, which returned only
  // the latter — so this read undefined, the total rendered "0 B" and the bar
  // got width:NaN%. The server now emits both, but production trails the
  // schema, so take whichever is present rather than depending on the rollout.
  const q = Visitor.quota() || {};
  const storage = q.storage != null ? q.storage : q.disk;
  // Unlimited entitlement — the claim-reward prize (5 years). The row still
  // carries $.disk at the BIGINT sentinel so nothing downstream divides by
  // zero, but that number must never be SHOWN: filesize() renders it as
  // "9.22 EB" and the bar sits at a permanent 0%, which reads as a bug rather
  // than as a prize.
  const unlimited = q.unlimited === true || q.unlimited === 1 || q.unlimited === "1";
  const use_rate = !unlimited && storage ? 100 * Visitor.diskUsed() / storage : 0;
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
          // Nothing to upgrade TO on an unlimited entitlement, and offering it
          // to someone who just won five years of storage reads as a dark
          // pattern.
          ...(unlimited ? [] : [Skeletons.Element({
            className: `upgrade text `,
            page: 1,
            // service: "upgrade-plan",
            service: `load-page`,
            content: LOCALE.UPGRADE_PLAN,
          })]),
        ]
      }),
      // The bar is a share-of-allowance readout and there is no allowance to
      // take a share of, so it is dropped rather than pinned at 0%.
      ...(unlimited ? [] : [Skeletons.Box.X({
        className: `${fig}-progress-container`,
        kids: [
          Skeletons.Element({
            className: `${fig}-progress-content`,
            style: {
              width: `${use_rate}%`
            }
          }),
        ]
      })]),
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
    api: ui.getApi,
    // api: {
    //   service: SERVICE.desk.disk_usage,
    //   hub_id: Visitor.id,
    //   category: '*',
    //   list: 1,
    // },
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
