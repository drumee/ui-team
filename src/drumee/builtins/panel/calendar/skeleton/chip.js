// The item chip, shared by the month / week / day grids.
// Figma: task card 1697:48543 (hover, with its ×, 1697:48544); workspace task
// card 1697:10988 with its pill 1697:11003 (hover 1697:11085); month meeting
// chip 1697:48542; week / day meeting block 1693:188958.
//
// Two shapes, matching the frames: a MEETING is a brand-tinted block with a
// 4px brand bar down its left edge — "1:30 PM title" on one line in a month
// cell, title over agenda on the hour canvas; a TASK is a white card with its
// priority dot over its name. A WORKSPACE task card also carries the workspace
// pill (folder + workspace name) and a personal one carries none, so in the
// Team view, where both kinds of row are mixed, the pill is what tells a
// workspace task from one this screen edits.
const { priorityMeta, resolveStatus, startLabel } = require("./helpers");
// The folder glyph the breadcrumb and the workspace switcher draw, from its one
// source. It returns an HTML string, hence Element + content.
const folderArt = require("media/grid/template/folder");

/**
 * Whether a row's card carries the workspace pill: a workspace row that names
 * its workspace. The frames draw no pill on a personal one.
 *
 * The one test for it — skeleton/month.js sizes a card by it to count "+N", so
 * the count and the drawn card cannot disagree.
 */
function hasPill(row) {
  return row.scope !== "personal" && !!row.origin_name;
}

/**
 * Workspace pill — the workspace this item came from, or null (see hasPill).
 *
 * One tint for every workspace: the frame tints each pill by its workspace's
 * area, but calendar.list sends no area, so every pill wears the tint and the
 * folder of 1697:11003 itself.
 */
function provenancePill(pfx, row) {
  if (!hasPill(row)) return null;
  // Inert, every node — see the note on the chip root.
  return Skeletons.Box.X({
    className: `${pfx}__chip-origin`,
    active: 0,
    kids: [
      Skeletons.Element({
        className: `${pfx}__chip-origin-ico`,
        content: folderArt({
          area: _a.share,
          filetype: _a.folder,
          widgetId: _.uniqueId("cal-origin-"),
          // No kebab: there is nothing for it to act on here.
          isAttachment: 1,
        }),
        active: 0,
      }),
      Skeletons.Note({
        className: `${pfx}__chip-origin-name`,
        content: row.origin_name,
        active: 0,
      }),
    ],
  });
}

/**
 * @param {Object} ui    the calendar widget
 * @param {Object} row   normalized calendar.list row
 * @param {Object} opt   { compact: 1 } for the month cell and the all-day
 *                       strip: a task card, or a one-line meeting chip;
 *                       { hour: 1 } for the week/day hour block, title over
 *                       agenda like the workspace Meet tab's schedule card;
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

  // A native title on every item: the full name a narrow cell cuts short, and
  // the workspace of a meeting, which the frames draw without a pill (the
  // month chip is "time title", the hour block title and agenda). It costs no
  // layout, and it is what tells the user which workspace a click on a
  // workspace item opens (its task card, or its Meeting tab) before they make it.
  const originText = [
    row.title,
    row.scope === "personal" ? LOCALE.PERSONAL : row.origin_name,
  ]
    .filter(Boolean)
    .join(" · ");

  const title = Skeletons.Note({
    className: `${pfx}__chip-title`,
    content: row.title,
    active: 0,
  });

  // Every node below carries its own `active: 0` — a Box's does not reach its
  // kids (see the note on the root below).
  let kids;
  if (hour) {
    // 1693:188958: the title, the agenda line under it, and nothing else —
    // where the block sits on the ruler already says when it runs.
    kids = [
      title,
      row.description
        ? Skeletons.Note({
            className: `${pfx}__chip-desc`,
            content: row.description,
            active: 0,
          })
        : null,
    ];
  } else if (meeting) {
    // 1697:48542: "1:30 PM title" on one line.
    kids = [
      Skeletons.Note({
        className: `${pfx}__chip-time`,
        content: startLabel(row),
        active: 0,
      }),
      title,
    ];
  } else {
    // 1697:48543: the priority dot over the name, 4px apart, and on a
    // workspace task the pill 12px under them.
    kids = [
      Skeletons.Box.Y({
        className: `${pfx}__chip-head`,
        active: 0,
        kids: [
          Skeletons.Note({
            className: `${pfx}__chip-dot`,
            styleOpt: { background: pm.color },
            active: 0,
          }),
          title,
        ],
      }),
      provenancePill(pfx, row),
    ];
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
  // open the item. A workspace row is deleted in its workspace, never here.
  if (row.scope === "personal" && row.can_write && !isOccurrence) {
    kids.push(
      Skeletons.Button.Svg({
        className: `${pfx}__chip-remove`,
        ico: "ph-x",
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
  // clicking a chip's time, title or pill once did nothing at all and only its
  // padding opened the item.
  //
  // Marked per node rather than with `kidsOpt: {active: 0}`: kidsOpt is merged
  // INTO each kid (builder.js `_.merge(k, a.kidsOpt)`), so it wins over a kid's
  // own props and would silence the remove button's own service — and it only
  // reaches DIRECT kids, never the card head's or the pill's nested nodes.
  //
  // A row for the one-line meeting chip, a column for the task card and the
  // hour block.
  return Skeletons.Box[meeting && !hour ? "X" : "Y"]({
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
      ...(originText ? { title: originText } : {}),
      "data-kind": row.kind,
      // The month cell and the week/day all-day strip get the card or the
      // one-line chip; the hour block gets the tall one. Stamped rather than
      // inferred from the grid's data-view, because the all-day strip is
      // compact inside a week/day grid — keying the skin on the view would size
      // those wrong.
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

module.exports = { chip, provenancePill, hasPill };
