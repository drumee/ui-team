// DEV FIXTURE — delete this file once calendar.list is implemented.
//
// The Personal Calendar reads one aggregated service, calendar.list, which does
// not exist server-side yet (it answers MODULE_NOT_FOUND). Without it there is
// nothing to render and no way to review the grids, chips, filters or forms.
//
// Loaded ONLY when the desk URL carries ?calfixture=1, and required lazily from
// inside that branch so it costs nothing on a normal session. Rows are shaped
// exactly like the documented calendar.list contract (skeleton/helpers.js), so
// whatever renders here is what will render against the real service.
//
// Deliberately exercises the awkward cases: a folder-owned row (read-only) next
// to a personal one (editable), two OVERLAPPING meetings that must lay out side
// by side, a recurring personal task, every status and every priority, and a
// title long enough to force the provenance pill to truncate it.
module.exports = function fixtureRows() {
  const today = Dayjs();
  const at = (dayOffset, hour, minute) =>
    today.startOf("day").add(dayOffset, "day").add(hour, "hour").add(minute || 0, "minute").unix();
  const on = (dayOffset) => today.startOf("day").add(dayOffset, "day").format("YYYY-MM-DD");

  return [
    // Two meetings that overlap — the column-packing case.
    {
      kind: "meeting", id: "fx-m1", hub_id: "fx-hub-1", nid: "fx-n1",
      scope: "folder", origin_name: "Product",
      title: "Sprint review", description: "Walk through sprint 1 deliverables",
      stime: at(0, 9), etime: at(0, 10), status: "todo", priority: "medium",
      can_write: 0, recur: null,
    },
    {
      kind: "meeting", id: "fx-m2", hub_id: "fx-hub-1", nid: "fx-n2",
      scope: "personal", origin_name: null,
      title: "1:1 with Lexis", description: "",
      stime: at(0, 9, 30), etime: at(0, 10, 30), status: "todo", priority: "high",
      can_write: 1, recur: null,
    },
    {
      kind: "meeting", id: "fx-m3", hub_id: "fx-hub-2", nid: "fx-n3",
      scope: "folder", origin_name: "Design System",
      title: "Design review", description: "Present concepts and rationale",
      stime: at(1, 13, 30), etime: at(1, 14, 30), status: "todo", priority: "medium",
      can_write: 0, recur: null,
    },
    // All-day tasks — one per status, so the pills and dots are all visible.
    {
      kind: "task", id: "fx-t1", hub_id: "fx-hub-1", nid: "fx-n10",
      scope: "folder", origin_name: "Product",
      title: "Ship the icon sprite", description: "Rebuild and verify",
      due_date: on(0), status: "in_progress", priority: "urgent", can_write: 0, recur: null,
    },
    {
      kind: "task", id: "fx-t2", hub_id: "fx-hub-1", nid: null,
      scope: "personal", origin_name: null,
      title: "Draft the retro notes", description: "",
      due_date: on(1), status: "todo", priority: "low", can_write: 1, recur: null,
    },
    {
      kind: "task", id: "fx-t3", hub_id: "fx-hub-3", nid: "fx-n11",
      scope: "folder", origin_name: "Marketing Website Redesign",
      title: "Review the launch copy for the pricing page and the FAQ",
      description: "Long title on purpose — the pill must survive it",
      due_date: on(2), status: "to_review", priority: "high", can_write: 0, recur: null,
    },
    {
      kind: "task", id: "fx-t4", hub_id: "fx-hub-1", nid: null,
      scope: "personal", origin_name: null,
      title: "Weekly planning", description: "",
      due_date: on(-1), status: "complete", priority: "medium", can_write: 1,
      // Recurring: expanded client-side, and every generated occurrence must be
      // read-only even though the series itself is editable.
      recur: { freq: "weekly" },
    },
    {
      kind: "task", id: "fx-t5", hub_id: "fx-hub-2", nid: "fx-n12",
      scope: "folder", origin_name: "Design System",
      title: "Audit dark theme tokens", description: "",
      due_date: on(4), status: "todo", priority: "medium", can_write: 0, recur: null,
    },
  ];
};
