// The item chip, shared by the month / week / day grids.
//
// Two shapes, matching the Figma frames: a MEETING renders time + title on a
// tinted block with a left accent bar; a TASK renders a priority dot + title on
// a white card. Both carry the provenance pill decided in the analysis (C-04) —
// grey folder/workspace name for a folder-owned item, indigo "Personal" for a
// personal one. Without it a read-only chip and an editable chip look identical,
// which is the one thing the user must be able to tell apart.
const { priorityMeta, resolveStatus, startLabel } = require("./helpers");

/**
 * Provenance pill — which workspace this item came from, or "Personal".
 * Returns null only when the row carries no origin at all; an aggregated row
 * always has one, so a missing pill means a malformed row.
 */
function provenancePill(pfx, row) {
  const personal = row.scope === "personal";
  const text = personal ? LOCALE.PERSONAL : row.origin_name;
  if (!text) return null;
  return Skeletons.Note({
    className: `${pfx}__chip-origin`,
    content: text,
    // Inert — see the note on the chip root.
    active: 0,
    attrOpt: { "data-scope": personal ? "personal" : "workspace" },
  });
}

/**
 * @param {Object} ui    the calendar widget
 * @param {Object} row   normalized calendar.list row
 * @param {Object} opt   { compact: 1 } for the month grid's single-line chip;
 *                       { hour: 1 } for the week/day hour block, which leads
 *                       with the TITLE the way the workspace Meet tab's own
 *                       schedule card does;
 *                       { style } for the hour canvas's absolute geometry —
 *                       passed in at construction rather than assigned to the
 *                       returned node, which the builder has already normalized
 *                       by then.
 */
function chip(ui, row, opt = {}) {
  const pfx = ui.fig.family;
  const compact = !!opt.compact;
  const hour = !!opt.hour;
  const meeting = row.kind === "meeting";
  const status = resolveStatus(row);
  const pm = priorityMeta(row.priority);

  // A recurrence occurrence is not its own record — it can never be edited or
  // deleted from the grid. Tested via is_occurrence (set by expandRecurrence),
  // never via recur_id: an occurrence carries the SERIES' id, so comparing the
  // two never distinguishes them.
  const isOccurrence = !!row.is_occurrence;

  // Month view suppresses the provenance pill (no room for it at four chips to
  // a cell — 43:31159), so a month-view user would have NO way to read which
  // workspace a task came from — on the one screen whose whole purpose is
  // aggregating several. A native title costs no layout and needs no frame, so
  // the compact chip carries it. Still worth it now that clicking a workspace
  // chip DOES go there (_openInWorkspace): the title is what tells the user
  // where the click is about to take them, before they make it.
  const originText = [
    row.title,
    row.scope === "personal" ? LOCALE.PERSONAL : row.origin_name,
  ]
    .filter(Boolean)
    .join(" · ");

  const lead = meeting
    ? Skeletons.Note({
        className: `${pfx}__chip-time`,
        content: startLabel(row),
        active: 0,
      })
    : Skeletons.Note({
        className: `${pfx}__chip-dot`,
        styleOpt: { background: pm.color },
        active: 0,
      });

  const title = Skeletons.Note({
    className: `${pfx}__chip-title`,
    content: row.title,
    active: 0,
  });

  // The hour block leads with the title, on its own line, with the time and the
  // provenance pill folded into a meta row beneath it — the shape the Meet
  // tab's schedule card has (title, then its agenda line). Stacked
  // time-then-title-then-pill, a one-hour block spent its first two lines on
  // when-and-where and clipped the title of the thing itself in half.
  const kids = hour
    ? [title]
    : [
        lead,
        title,
        // 43:31159 draws the month chip as lead + title and nothing else — at
        // three chips to a cell there is no room for the pill, and it crowded
        // out the title it was meant to qualify. Month users still get it from
        // the item itself on open.
        compact ? null : provenancePill(pfx, row),
      ];

  // Under the title, in the order the Meet tab's card reads: agenda line first,
  // then the when-and-where the aggregated view can't do without. Every node in
  // the meta row carries its own `active: 0` — a Box's does not reach its kids
  // (see the note on the root below).
  if (hour) {
    if (row.description) {
      kids.push(
        Skeletons.Note({
          className: `${pfx}__chip-desc`,
          content: row.description,
          active: 0,
        }),
      );
    }
    const meta = [lead, provenancePill(pfx, row)].filter(Boolean);
    if (meta.length) {
      kids.push(
        Skeletons.Box.X({ className: `${pfx}__chip-meta`, active: 0, kids: meta }),
      );
    }
  }

  // The week/day block has room for the agenda line and a status pill; the
  // month chip is one line and gets neither.
  if (!compact && !hour) {
    if (row.description) {
      kids.push(
        Skeletons.Note({
          className: `${pfx}__chip-desc`,
          content: row.description,
          active: 0,
        }),
      );
    }
    if (!meeting && status.label) {
      kids.push(
        Skeletons.Box.X({
          className: `${pfx}__chip-status`,
          attrOpt: { "data-theme": status.theme },
          // Every level has to be inert, not just this one: kidsOpt/active is
          // applied per node and does not reach a grandchild.
          active: 0,
          kids: [
            Skeletons.Note({
              className: `${pfx}__chip-status-dot`,
              styleOpt: { background: status.color },
              active: 0,
            }),
            Skeletons.Note({
              className: `${pfx}__chip-status-label`,
              content: status.label,
              active: 0,
            }),
          ],
        }),
      );
    }
  }

  // Hover delete, personal + writable rows only. bubble:0 so it does not also
  // open the item. A folder-owned row is deleted in its folder, never here.
  if (row.scope === "personal" && row.can_write && !isOccurrence) {
    kids.push(
      Skeletons.Button.Svg({
        className: `${pfx}__chip-remove`,
        ico: "cross",
        bubble: 0,
        service: "cal-remove-item",
        uiHandler: [ui],
        itemId: row.id,
        itemKind: row.kind,
        itemHub: row.hub_id,
        itemNid: row.nid,
      }),
    );
  }

  // Every kid above carries `active: 0` and the remove button deliberately does
  // NOT. ui-core binds an onclick to every widget left at the default, and that
  // handler calls e.stopPropagation() BEFORE triggerHandlers — so an inert kid
  // left active swallows the click and this service never fires. That is why
  // clicking a chip's time, title, provenance pill or status did nothing at all
  // and only its 7px of padding opened the item.
  //
  // Marked per node rather than with `kidsOpt: {active: 0}`: kidsOpt is merged
  // INTO each kid (builder.js `_.merge(k, a.kidsOpt)`), so it wins over a kid's
  // own props and would silence the remove button's own service — and it only
  // reaches DIRECT kids, never the status pill's nested notes.
  return Skeletons.Box[compact ? "X" : "Y"]({
    className: `${pfx}__chip`,
    ...(opt.style ? { styleOpt: opt.style } : {}),
    bubble: 0,
    service: "cal-open-item",
    uiHandler: [ui],
    itemId: row.id,
    itemKind: row.kind,
    itemHub: row.hub_id,
    itemNid: row.nid,
    // A generated occurrence shares its series' id, so the handler cannot tell
    // the two apart from the id alone — say so explicitly, or clicking an
    // occurrence would open the series for editing.
    itemOccurrence: isOccurrence ? 1 : 0,
    // THIS chip's start, which for an occurrence is not the series'. The
    // handler forwards it as the Meeting tab's anchor so the tab opens on the
    // date that was clicked.
    itemStime: row.stime || 0,
    attrOpt: {
      // Spread, never `title: undefined` — refresh() does a bare
      // setAttribute(k, v) over the attribute model, so an undefined value
      // lands in the DOM as the literal string "undefined".
      ...(compact && originText ? { title: originText } : {}),
      "data-kind": row.kind,
      // The month cell and the week/day all-day strip get a one-line card; the
      // hour block gets the full one. Stamped rather than inferred from the
      // grid's data-view, because the all-day strip is compact inside a
      // week/day grid — keying the skin on the view would size those wrong.
      "data-compact": compact ? "1" : "0",
      "data-scope": row.scope,
      "data-status": row.status || "todo",
      "data-priority": row.priority || "medium",
      // Drives the edit-here vs hand-over-to-the-workspace affordance in the
      // skin (cursor, hover treatment) without a second class — read together
      // with data-scope above, see the &__chip cursor rules.
      "data-writable": row.can_write ? "1" : "0",
      "data-occurrence": isOccurrence ? "1" : "0",
    },
    kids: kids.filter(Boolean),
  });
}

module.exports = { chip, provenancePill };
