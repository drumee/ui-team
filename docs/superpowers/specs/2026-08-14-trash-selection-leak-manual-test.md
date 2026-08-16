# Trash defects — manual test matrix

**Scope:** `modules/desk/wm/index.js` (`confirmRemoveHub`, `removeMediaSelection`,
`getMediaSelection`), `builtins/window/utils.js` (`removeContent`), new
`libs/media-selection.js`. Three defects, all in the trash path, none of them
caused by activate-workspace — see "Provenance" at the end.

| Fix | Defect |
|---|---|
| 1 | a cancelled workspace delete left the item selected, arming the next trash |
| 2 | files/folders in a selection were trashed with no confirmation at all |
| 3 | the window manager deleted **itself** when trashing a workspace it had once been inside |

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

## Fix 3 — the window manager deleting itself

**Independent of Fix 1 and Fix 2**, and it predates both. `window/utils.js` was
untouched by `730f550e` (`git log 58e176a7..HEAD -- src/drumee/builtins/window/utils.js`
is empty) and by every other commit on this branch; the echo `confirmRemoveHub`
publishes was not modified either. Neither fix could reach it: `removeContent`
destructures only `{nid, hub_id, filepath}`, so the `state: 1` that
`media.select()` used to add was never read, and a solo hub trash does not trip
the new gate (`allowed` is empty, so `needsBulkConfirm` is false and the path is
byte-identical).

**The mechanism.** `Wm` inherits `removeContent` (manager → interact → core →
utils) and subscribes to the same `WS_EVENT` bus `confirmRemoveHub` publishes on,
so it runs for every delete echo. It also carries a `hub_id` and `filepath` in its
own model — `loadWorkspace` does `this.mset(data)` — and `onWorkspaceClosed` clears
the headless layer **without** resetting that model. Only `Wm.reload()` does, and
that runs at mount and on a failed delete, not on close.

So after opening a workspace and closing it, Wm still claims to be inside it, and
`removeContent`'s "Remove self" branch fires for **Wm itself**: `Wm.goodbye()`
destroys the desk's work area, leaving `desk-wrapper` holding only its
`settings-main-slot` child — which is `position:absolute; inset:0; z-index:1500`
over the container. Hence the report: "`wm-container` replaced by
`settings-main-slot`".

| # | Case | Expected |
|---|---|---|
| 16 | Open a workspace, close it (back to Home), then trash it from the grid | The tile goes, the grid stays. `.desk-module__wm-container` still contains the window manager — inspect it and confirm `window_manager` is present, not just `settings-main-slot`. This is the reported bug |
| 17 | Same, but never open the workspace first (fresh load → trash it) | Also fine. Wm's `hub_id` is `Visitor.id`, so the self-test never matched — the bug needs a workspace to have been opened at some point in the session |
| 18 | Open a workspace, stay inside it, delete it from the sidebar workspace list | The workspace window closes (correct — that IS a window of the deleted hub) and the desk returns to Home with the work area intact |
| 19 | Open workspace A, close it, open workspace B, then trash **A** from the grid | B stays open and usable. Before the fix, Wm's model pointing at either one was enough to kill the whole area |
| 20 | Repeat 16 for an **external (share)** workspace and a **public** one | Same result. `area` plays no part in the self-test — the `private` in the original report was incidental |
| 21 | Open a workspace, navigate into a subfolder, close the workspace, then trash a **folder** that was an ancestor of where you were | Work area intact. Same branch, reached by a folder delete rather than a hub delete |
| 22 | Trash a plain file from the home grid | Unaffected, as before — a file's filepath is not a prefix of Wm's path |

Note while reading that branch: `new RegExp("^" + filepath)` treats the path as a
pattern, so a workspace or folder named with regex metacharacters (`a+b`, `x(y`)
matches something other than itself, or throws. Pre-existing, out of scope here,
and worth its own fix.

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
