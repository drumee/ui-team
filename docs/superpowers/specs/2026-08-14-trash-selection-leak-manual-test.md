# Trash selection leak + multi-item gate — manual test matrix

**Scope:** `modules/desk/wm/index.js` (`confirmRemoveHub`, `removeMediaSelection`,
`getMediaSelection`), new `libs/media-selection.js`. Nothing to do with
activate-workspace — see "Provenance" at the end.

## The defect

"Move to trash" does not act on the item you right-clicked. It acts on the whole
selection (`getMediaSelection` → `getGlobalSelection` → every list child whose
`_a.state` is truthy) and merely adds the clicked item if it was not already in
there. The buckets it splits into are not equivalent:

| Bucket | What happened |
|---|---|
| owned hub | `confirmRemoveHub` — a dialog naming it. Destroys the workspace |
| someone else's hub | `confirmLeaveHub` — a dialog naming it |
| folder containing a hub | `confirmRemoveHubsInside` — its own dialog |
| **file / plain folder** | **trashed immediately, no dialog at all** |

`confirmRemoveHub` called `media.select()` before raising its dialog, as a visual
cue — and nothing unselected it when the user declined. So every cancelled
workspace delete left an item armed for the *next* trash, and any file caught in
the same selection went silently.

**Fix 1** removes that `select()`. **Fix 2** asks once, up front, whenever the
action would trash more than one thing and at least one of them has no dialog of
its own.

## Setup

Needs a real desk with several items on the home grid: at least two owned
workspaces and at least two files or plain folders. Any deployed instance with a
real user; none of this runs on the dev box.

A selected tile is **visible** — `select()` sets `data-selected="1"`, and
`grid/skin/index.scss:130` shows the tile's checkbox and a selected fill. Use
that as the read-out for every selection assertion below rather than inferring it.

## Fix 1 — the leak

| # | Case | Expected |
|---|---|---|
| 1 | Right-click a workspace → **Move to trash** → **cancel** the dialog | The tile is NOT left selected: no checkbox, no selected fill. Before the fix it stayed selected |
| 2 | Do case 1, then right-click a **different** workspace → Move to trash | **Exactly one** dialog, naming the second workspace. Before the fix: two dialogs, the first for the workspace cancelled in case 1 |
| 3 | Do case 1 three times on three different workspaces, then trash a fourth | Still exactly one dialog. The leak accumulated monotonically before the fix |
| 4 | Do case 1, then right-click a **file** → Move to trash | Only the file is trashed. Before the fix the cancelled workspace went with it, behind one dialog |
| 5 | Right-click a workspace → Move to trash → **dismiss with ESC** rather than the Cancel button | Same as case 1. This is the exit a cancel-path-only patch would have missed |
| 6 | Right-click a workspace → Move to trash → **confirm** | Deletes normally: dialog, trash animation, tile gone, sidebar entry gone. Unchanged behaviour |
| 7 | While a workspace delete dialog is open, look at the tile behind it | It is no longer highlighted. Accepted cosmetic loss — the dialog names the workspace, and `confirmLeaveHub` has always worked this way |

## Fix 2 — the multi-item gate

Selection here is built deliberately: click one item, then ctrl/cmd-click or
shift-click others, or drag a marquee.

| # | Case | Expected |
|---|---|---|
| 8 | Select **one** file → Move to trash | Trashed immediately, no gate. The everyday action must stay one gesture |
| 9 | Select **three** files → Move to trash | One dialog: "Move 3 selected items to trash?" Confirm → all three trashed |
| 10 | Same, then **cancel** | Nothing is trashed. No animation, no tiles removed, selection intact |
| 11 | Select **one file + one workspace** → Move to trash | The gate first ("2 selected items"), then the workspace's own named dialog. The file is the reason the gate exists |
| 12 | Select **two workspaces**, no files → Move to trash | NO gate — two named dialogs only. Each already asks; a gate in front would be a question about questions |
| 13 | Select one file plus several **locked** or non-removable items → Move to trash | No gate. Locked/rejected items are only reported, so they must not push a single real trash over the threshold |
| 14 | Select a folder **containing a workspace** plus a file → Move to trash | Gate (2 items), then the folder's own hubs-inside dialog |
| 15 | Cancel the gate at case 9, then trash a single file on its own | Works normally, no gate — cancelling the gate leaves no residue |

## What is covered automatically

`node --test tests/media-selection.test.js` — 19 cases over the extracted pure
module: every bucket precedence rule (locked beats everything, a hub's
`canRemove` is never consulted, a folder containing a hub is neither trashed nor
rejected), and the gate's full truth table including the two cases that define
it — a single trash is not gated, and a hubs-only selection is not gated.

The rest needs a browser: `wm/index.js` cannot be required outside webpack (it
fails on `require("./skin")`), so `confirmRemoveHub` and `removeMediaSelection`
themselves have no honest unit coverage. That is why the extraction was worth
doing — it moved the part with branches into something testable.

## Provenance, and what is still open

Found while root-causing a report of the whole media grid emptying after a
"Move to trash" following an activate-workspace run. That investigation cleared
activate-workspace mechanically — the trash path never touches `media/form`, the
desk's invite relays, the exit guard, `workspace:refresh`, or any collection
reset — and turned up this leak instead.

**This explains that report; it does not confirm it.** The mechanism requires at
least one cancelled workspace delete earlier in the same session, which nobody
has confirmed happened. The alternative — a single `delete_hub` failing and
`reload()` re-rendering the grid empty (`wm/index.js`'s failure path) — was
weakened but not closed: the `post_override` route to it is mechanically
impossible (the override changes which panel opens after creation, never the
hub's `area` or any server state), but an unrelated failure is still possible and
no one confirmed whether a `DELETE_WORKSPACE_FAILED` toast appeared.

Two things would close it out definitively:

- **The "before" screenshot** — if more than one tile shows a checkbox or the
  selected fill, this leak is confirmed as the cause.
- **Confirmation that a workspace delete was cancelled** earlier in that session.

Until then the original report stands as unresolved-but-deprioritised behind
these fixes, which are justified on their own terms.
