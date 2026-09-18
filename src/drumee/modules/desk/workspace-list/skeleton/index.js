/**
 * Sidebar module (refactored)
 */


const cls = (fig, suffix) => `${fig}__${suffix}`;


// ---------- Export ----------
module.exports = function (ui) {
  const fig = ui.fig.family;

  const list = Skeletons.List.Smart({
    className: cls(fig, "list"),
    innerClass: `${cls(fig, "content")}`,
    sys_pn: _a.list,
    flow: _a.none,
    // NO `timer:` HERE, DELIBERATELY — same reason as the file surfaces in
    // window/skeleton (see the note at gridFilesBrowser). `timer: N` arms
    // ui-core's tick() loop (letc/widgets/list/index.js:194), which re-arms
    // itself from renderData() after every page and only stops at
    // `_end_of_data`, so the list silently walks the ENTIRE listing while the
    // tab sits idle.
    //
    // It was dormant on small accounts, which is why it survived the first
    // pass: desk.home answers short on page 1 for anyone with fewer than 45
    // root-level home items, the list calls _eod() and the loop stops. An
    // account that fills a page did not get that reprieve — it walked
    // desk.home once per SECOND, and desk.home measured 442ms avg / 1,967ms
    // max on production.
    //
    // Paging is unaffected: _onScroll (list/index.js:517) is bound for every
    // List.Smart independently of `timer` and fetches the next page on
    // reaching the bottom, with useMouseWheel() covering the not-yet-
    // scrollable case.
    spinnerWait: 1000,
    spinner: true,
    vendorOpt: Preset.List.Orange_e,
    itemsOpt: {
      kind: "workspace_item",
      uiHandler: [ui],
      service: "load-workspace",
      nodeRole: "workspace",
      level: 0,
      radio: `sidebar-radio`, /** Shaed with sidebar items */
    },
    partHandler: ui,
    api: {
      service: SERVICE.desk.home,
      hub_id: Visitor.id,
      // hubs AND home-root folders — Personal workspaces are personal-area
      // folders, not hubs. Row filtering lives in the widget's onPartReady
      // (prepareData) because the mix needs per-filetype rules that the flat
      // `skip` regex cannot express.
      type: "node"
    },
  });

  return list;
};
