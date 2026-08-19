// Notification Center tab bar (Round 3 / Sprint 1 — Figma `filter-bar`).
//
// Replaces the old 3 tabs (All activity / Mentions / Shares) with the six the
// design specifies: All + one per notification bucket. `All` is the default and
// means "no bucket scope" — the server returns the whole feed for it, which is
// exactly the pre-existing behaviour.
//
// Each tab carries an unread count badge (Figma `number-noti`), fed by
// activity.unread_counts and refreshed in place via its `tab-count-<bucket>`
// part, so updating a number never re-renders the bar and never disturbs which
// tab is selected.
//
// The bucket strings are the contract with the server: they must match the
// values `bucketOf` stamps on every row in service/private/activity.js.
const TABS = [
  { bucket: 'all', label: 'ALL' },
  { bucket: 'files', label: 'FILES' },
  { bucket: 'task', label: 'TASK' },
  { bucket: 'meeting', label: 'MEETING' },
  { bucket: 'chat', label: 'CHAT' },
  { bucket: 'other', label: 'OTHER' },
];

const DEFAULT_BUCKET = 'all';

module.exports = function (ui) {
  const pfx = ui.fig.family;
  const active = ui._filter || DEFAULT_BUCKET;

  return Skeletons.Box.X({
    className: `${pfx}__tabbar`,
    kids: TABS.map((tab) =>
      Skeletons.Box.X({
        className: `${pfx}__tab`,
        service: `tab-${tab.bucket}`,
        sys_pn: `tab-${tab.bucket}`,
        state: tab.bucket === active ? 1 : 0,
        uiHandler: ui,
        // No partHandler on purpose: the panel defines no onPartReady, and
        // `sys_pn` alone is enough for ensurePart() to reach these later.
        radio: `radio-${ui._id}`,
        // The label and badge must not be independently clickable. Without
        // active:0 a click on a child resolves handlers by walking the parent
        // chain and reaches Wm with no service, which falls through to its
        // default branch and clears the user's file selection. Same guard the
        // unread toggle in topbar.js uses.
        kidsOpt: { active: 0 },
        kids: [
          Skeletons.Note({
            className: `${pfx}__tab-label`,
            content: LOCALE[tab.label],
          }),
          // Rendered empty and hidden via data-empty; _renderTabCounts fills it
          // once the counts arrive. Kept in the tree from the start so the part
          // exists to be addressed later.
          Skeletons.Note({
            className: `${pfx}__tab-count`,
            sys_pn: `tab-count-${tab.bucket}`,
            content: '',
            dataset: { empty: '1' },
          }),
        ],
      }),
    ),
  });
};

// Exported so the panel iterates one list instead of repeating the buckets —
// the tab set is defined here only.
module.exports.TABS = TABS;
module.exports.BUCKETS = TABS.map((t) => t.bucket);
module.exports.DEFAULT_BUCKET = DEFAULT_BUCKET;
