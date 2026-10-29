// The item chip, shared by the month / week / day grids.
// Figma: task card 1697:48543 (hover, with its ×, 1697:48544); workspace task
// card 1697:10988 with its pill 1697:11003 (hover 1697:11085); month meeting
// chip 1697:48542; week / day schedule card 1693:188959; day task card
// 2069:181433.
//
// Two shapes, matching the frames: a MEETING is a brand-tinted block with a
// 4px brand bar down its left edge — "1:30 PM title" on one line in a month
// cell, time over title over agenda on the week/day board; a TASK is a white
// card with its priority dot over its name, and its description under them in
// the Day view. A WORKSPACE task card also carries the workspace
// pill (folder + workspace name) and a personal one carries none, so in the
// Team view, where both kinds of row are mixed, the pill is what tells a
// workspace task from one this screen edits.
const { priorityMeta, startLabel, subtaskCounts } = require("./helpers");
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

// The Day view's card shows this many file pills, then "+N" (2069:181634).
const FILES_SHOWN = 2;

/**
 * The Day card's attached files (2069:181634): paperclip pills, the first
 * FILES_SHOWN of them, then "+N". Inert, every node: a click anywhere on the
 * card opens the task. Null when there are none.
 */
function filesRow(pfx, row) {
  const files = row.files || [];
  if (!files.length) return null;
  const more = files.length - FILES_SHOWN;
  return Skeletons.Box.X({
    className: `${pfx}__chip-files`,
    active: 0,
    kids: [
      ...files.slice(0, FILES_SHOWN).map((f) =>
        Skeletons.Box.X({
          className: `${pfx}__chip-file`,
          active: 0,
          kids: [
            Skeletons.Image.Svg({ ico: "app-attachment", className: `${pfx}__chip-file-ico`, active: 0 }),
            Skeletons.Note({ className: `${pfx}__chip-file-name`, content: f.name, active: 0 }),
          ],
        }),
      ),
      more > 0
        ? Skeletons.Note({ className: `${pfx}__chip-file-more`, content: `+${more}`, active: 0 })
        : null,
    ].filter(Boolean),
  });
}

/**
 * The Day card's footer (subtasks-desktop-board, 844:92547): icon,
 * "Subtasks", done/total, caret. Display only — the calendar has no subtask
 * list to expand; the card's click opens the task. Null with no subtasks.
 */
function subtasksFooter(pfx, row) {
  const { done, total } = subtaskCounts(row);
  if (!total) return null;
  return Skeletons.Box.X({
    className: `${pfx}__chip-subtasks`,
    active: 0,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__chip-subtasks-lead`,
        active: 0,
        kids: [
          Skeletons.Image.Svg({ ico: "ph-stack-simple", className: `${pfx}__chip-subtasks-ico`, active: 0 }),
          Skeletons.Note({ className: `${pfx}__chip-subtasks-label`, content: LOCALE.SUBTASKS, active: 0 }),
          Skeletons.Note({ className: `${pfx}__chip-subtasks-count`, content: `${done}/${total}`, active: 0 }),
        ],
      }),
      Skeletons.Image.Svg({ ico: "caret-right", className: `${pfx}__chip-subtasks-caret`, active: 0 }),
    ],
  });
}

/**
 * @param {Object} ui    the calendar widget
 * @param {Object} row   normalized calendar.list row
 * @param {Object} opt   { compact: 1 } for the month cell: a task card, or a
 *                       one-line meeting chip;
 *                       { board: 1 } for the week/day board: the meeting is
 *                       the schedule card, time over title over agenda;
 *                       { board: 1, detail: 1 } for the Day view's task card,
 *                       which adds the description and wraps its name.
 */
function chip(ui, row, opt = {}) {
  const pfx = ui.fig.family;
  const compact = !!opt.compact;
  const board = !!opt.board;
  const detail = !!opt.detail;
  const meeting = row.kind === "meeting";
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
  const desc = row.description
    ? Skeletons.Note({
        className: `${pfx}__chip-desc`,
        content: row.description,
        active: 0,
      })
    : null;

  let kids;
  if (meeting && board) {
    // 1693:188959: the time in brand ink, the title, the agenda line — one
    // line each.
    kids = [
      Skeletons.Note({
        className: `${pfx}__chip-time`,
        content: startLabel(row),
        active: 0,
      }),
      title,
      desc,
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
      // 2069:181433: the Day view's card carries the description under the
      // name, then the pill; 2069:181634 adds the files and the subtasks.
      detail ? desc : null,
      provenancePill(pfx, row),
      detail ? filesRow(pfx, row) : null,
      detail ? subtasksFooter(pfx, row) : null,
    ];
  }

  // Hover delete. bubble:0 so it does not also open the item. A personal row
  // the viewer may write; and a workspace MEETING its reporter sees
  // (calendar.list answers can_write = created_by === caller; room.remove is
  // creator-only server-side). A workspace task is deleted on its board.
  // Never an occurrence of a series.
  const removable =
    row.can_write && (row.scope === "personal" || row.kind === "meeting");
  if (removable && !isOccurrence) {
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
  // schedule card.
  return Skeletons.Box[meeting && !board ? "X" : "Y"]({
    className: `${pfx}__chip`,
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
      // The month cell gets the card or the one-line chip, the week/day board
      // the schedule card and (Day view) the detailed task card. Stamped on
      // the chip so the skin keys on the item, not on the grid around it.
      "data-compact": compact ? "1" : "0",
      "data-board": board ? "1" : "0",
      "data-detail": detail ? "1" : "0",
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
