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
    attrOpt: { "data-scope": personal ? "personal" : "workspace" },
  });
}

/**
 * @param {Object} ui    the calendar widget
 * @param {Object} row   normalized calendar.list row
 * @param {Object} opt   { compact: 1 } for the month grid's single-line chip;
 *                       { style } for the hour canvas's absolute geometry —
 *                       passed in at construction rather than assigned to the
 *                       returned node, which the builder has already normalized
 *                       by then.
 */
function chip(ui, row, opt = {}) {
  const pfx = ui.fig.family;
  const compact = !!opt.compact;
  const meeting = row.kind === "meeting";
  const status = resolveStatus(row);
  const pm = priorityMeta(row.priority);

  // A recurrence occurrence is not its own record — it can never be edited or
  // deleted from the grid. Tested via is_occurrence (set by expandRecurrence),
  // never via recur_id: an occurrence carries the SERIES' id, so comparing the
  // two never distinguishes them.
  const isOccurrence = !!row.is_occurrence;

  const lead = meeting
    ? Skeletons.Note({
        className: `${pfx}__chip-time`,
        content: startLabel(row),
      })
    : Skeletons.Note({
        className: `${pfx}__chip-dot`,
        styleOpt: { background: pm.color },
      });

  const kids = [
    lead,
    Skeletons.Note({
      className: `${pfx}__chip-title`,
      content: row.title,
    }),
    // 43:31159 draws the month chip as lead + title and nothing else — at three
    // chips to a cell there is no room for the pill, and it crowded out the
    // title it was meant to qualify. The week/day block keeps it: those chips
    // are full-height and the provenance is the whole point of an aggregated
    // view. Month users still get it from the item itself on open.
    compact ? null : provenancePill(pfx, row),
  ];

  // The week/day block has room for the agenda line and a status pill; the
  // month chip is one line and gets neither.
  if (!compact) {
    if (row.description) {
      kids.push(
        Skeletons.Note({
          className: `${pfx}__chip-desc`,
          content: row.description,
        }),
      );
    }
    if (!meeting && status.label) {
      kids.push(
        Skeletons.Box.X({
          className: `${pfx}__chip-status`,
          attrOpt: { "data-theme": status.theme },
          kids: [
            Skeletons.Note({
              className: `${pfx}__chip-status-dot`,
              styleOpt: { background: status.color },
            }),
            Skeletons.Note({
              className: `${pfx}__chip-status-label`,
              content: status.label,
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
    attrOpt: {
      "data-kind": row.kind,
      "data-scope": row.scope,
      "data-status": row.status || "todo",
      "data-priority": row.priority || "medium",
      // Drives the read-only vs editable affordance in the skin (cursor,
      // hover treatment) without a second class.
      "data-writable": row.can_write ? "1" : "0",
      "data-occurrence": isOccurrence ? "1" : "0",
    },
    kids: kids.filter(Boolean),
  });
}

module.exports = { chip, provenancePill };
