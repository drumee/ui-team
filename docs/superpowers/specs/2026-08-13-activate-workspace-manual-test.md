# activate-workspace — manual test matrix

None of this can run on the dev box: it needs a real `desk.create_hub` and a
real upload. Run it against a deployed instance with a real user — e.g.
`https://drumee.in/-/huan/`.

## How to start it by hand

Two ways, and neither needs a fresh signup.

**URL flag**, the counterpart to the reward flow's `?reward=1`:

```
https://drumee.in/-/huan/#/desk?activate=1
```

Give home ~2s to settle and the flow mounts on its own. A `?activate=1` load
also makes the reward flow stand down, so an account that happens to hold a
`reward_claim` row still gets THIS walkthrough rather than that one.

**Console**, for repeat runs without reloading (`window.Desk` is the live desk
module):

```js
Desk.startActivateWorkspace()
```

Callable as often as you like — the flow keeps no state and latches nothing off,
so each call is a clean run. Bear in mind each run has you create another
workspace.

A forced run is an ORDINARY run: unlike `?reward=1`, which has to be threaded
into the widget so a test cannot write to the campaign funnel or burn a limited
slot, there is nothing here for a test to corrupt, so the widget is never told
it was forced.

There is nothing to reset between cases — the flow persists nothing. Note a
reload does NOT resume it: start it again with either method above. Workspaces
created along the way are real and are left behind; delete them between runs if
they get in the way.

To exercise the AUTOMATIC trigger (the thing real users get) rather than the
forced one, load `#/desk?tutorial=1` and finish or skip to the end of the tour —
the flow mounts as the tour is destroyed. That path is case 1 below and is worth
running at least once, since it is the only one that proves the chaining.

## Step 1 — create the workspace

| # | Case | Expected |
|---|---|---|
| 1 | Finish the automatic tour (`?tutorial=1`) | Step 1 card, centred, 1 of **3** progress segments lit, single **Continue** button and no Back |
| 1a | Load `?activate=1` on a plain login | Same card, ~2s after home settles |
| 1b | `Desk.startActivateWorkspace()` in the console | Same card, immediately |
| 2 | Click **Continue** | Cutout on the topbar **New** button; coach reads "Click New to get started" |
| 3 | Click **New** | The create flyout expands by itself; cutout narrows to the **Workspace** row; the sibling rows are greyed and unclickable |
| 4 | Click **Workspace** | Cutout wraps the whole create-workspace card (rounded corners included, no bright band) |
| 5 | Create a **team** workspace | Step 1 ENDS on the panel: it slides in, the cutout follows it as it animates, and the **Step 2 card** appears beside it — 2 of 3 segments lit, the step title and description, no primary button, **Back** in brand purple, **Skip for now** beneath. NO "waiting for…" line |
| 6 | Create an **external (share)** workspace instead | The **members panel** opens, NOT the secure-share dock — Step 1 ends on it exactly as case 5 does, and Step 2 runs on it via Route A. This is the `post_override` at work |
| 6a | Same, but check the dock never appears | No right-dock secure-share panel at any point, not even briefly — the override stops it being launched rather than closing it afterwards |
| 7 | Create a **personal** workspace instead | No follow-up panel at all; Step 2 card immediately |
| 8 | **Back** at sub-steps 2/3/4 | Steps back one sub-step (form → dropdown → New button); Back at the New button leaves the walkthrough for the Step 1 card |
| 9 | Back to Step 1, **Continue**, create a *different* workspace type | Steps 2 and 3 both reflect the NEW run. Note the first workspace is left behind — known and accepted, same as reward-flow |

## Step 2, Route A — the permission panel (team workspaces)

Reached from case 5. This panel *is* Step 2, so the card sits beside it rather than in front of it.

| # | Case | Expected |
|---|---|---|
| 10 | Invite a member from the panel, then close the confirmation | The card steps aside while the confirmation is up (no stray Back under it), the cutout moves onto the confirmation, and closing it advances to **Step 3** |
| 11 | Fail an invite from the panel (bad address) | The error notice appears but the step does NOT advance — success is the panel's `invitation:sent` broadcast, not the presence of a notice |
| 12 | Close the panel with nothing sent | The **Step 2 card** with its **Invite member** button. NOT a rewind to Step 1's create form — that is where reward-flow goes, and this flow deliberately does not |
| 13 | Press the card's **Back** while the panel is open | The panel closes and lands on the Step 2 card, exactly as case 12 — one exit, two ways of asking for it |
| 14 | Press **Skip for now** while the panel is open | Panel closes, flow advances to **Step 3**, 3 of 3 segments lit |
| 15 | Click beside the panel (the dimmed area) | Nothing dismisses. The card pulses once; the panel is exactly as it was |
| 16 | Click the card's **Back**/**Skip** where the modal backdrop covers the card | Still works — the backdrop listener routes a click by geometry to the control underneath rather than absorbing it. Matters more than it used to: Skip is now the only way past Step 2 for an account that cannot invite |

## Step 2, Route B — the invite popup (from the card)

| # | Case | Expected |
|---|---|---|
| 17 | On the Step 2 card, click **Invite member** (paid plan) | Cutout moves off the topbar Invite button and onto the popup; the card stays under the topbar button and does not jump; the primary button goes, Back and Skip stay, and NO "waiting for…" line appears |
| 18 | Open one of the popup's dropdowns (email suggestions, workspace search, role menu) | The hole GROWS to take the list in — no half-lit list hanging below the popup |
| 19 | Send an invitation | Popup closes, confirmation replaces it, card steps aside, cutout follows onto the confirmation; dismissing it advances to **Step 3** |
| 20 | Close the popup without sending | Back to the Step 2 card, retryable |
| 21 | Click beside the popup | Nothing dismisses; the card pulses. The popup keeps **the typed emails** — the click is absorbed rather than replacing anything |
| 22 | **Free-solo account** (fresh signup): click **Invite member** | The desk's plan-limit notice appears and the flow STAYS on the Step 2 card — it must not enter the waiting state for a popup that will never open |
| 23 | Same account, then **Skip for now** | Advances to Step 3. This is the path most real onboarding users will take |
| 24 | Hammer the backdrop beside the popup ten times | Ten pulses, no dismissal, no drift — the pulse re-arms each press rather than only firing once |

## Step 3 — upload the first file

| # | Case | Expected |
|---|---|---|
| 25 | Reach Step 3 by any route | Card centred (not under a topbar control), 3 of 3 segments lit, **Back** + **Open workspace** |
| 26 | Click **Open workspace** | The workspace opens; the whole screen dims with no hole; coach reads "This is your workspace" with **Back** and **Next** |
| 27 | Click **Next** | Cutout narrows to the folder **+ New** pill |
| 28 | Click **+ New** | Cutout narrows to **From device**; the other dropdown rows are greyed |
| 29 | Click **From device**, pick a file | OS picker opens; progress window appears with the cutout on it and the coach above it (never over the rows) |
| 30 | Wait for the upload to finish | Cutout moves to the files panel with the new file visible; coach's **Next** becomes enabled |
| 31 | Click that **Next** | The workspace closes by itself, the desk is back at Home, and the closing modal appears over a single-depth dim: green check chip, **Congratulations!**, "You have activated your workspace. Welcome to drumee", one **Back to home** button |
| 32 | Click **Back to home** | Everything disappears; desk is usable; no invisible blocker over it (click a sidebar row to confirm) |
| 33 | Upload several files at once | The last beat is reached on the first file, but **Next** stays disabled and greyed until the whole batch is done |
| 34 | Cancel or fail one file in the batch | Coach switches to the "Some files didn't upload" line; **Next** disabled |
| 35 | Press **Back** on that failed beat | Progress window closes and the walkthrough rewinds to the **+ New** pill (not out to the card) |
| 36 | Retry the failed file successfully instead | Coach returns to the normal wording and **Next** enables — the failure is read live, not latched |
| 37 | **Back** at any beat of cases 26–30 | Leaves the walkthrough for the Step 3 card; the workspace stays open; **Open workspace** re-enters the walkthrough from the top |
| 38 | **Back** on the Step 3 card | The workspace CLOSES and the flow lands on the Step 2 card, whose invite popup needs the desk topbar visible |
| 39 | Delete the workspace in another tab, then click **Open workspace** | The flow ENDS and releases the desk. A card whose only button cannot act would be a trap now that no exit is offered, so a run that cannot be completed stops instead |
| 39a | Same, but the workspace still exists and merely fails to mount | After ~4 s the flow returns to the Step 3 card so the button can be pressed again (the descriptor is kept — there is no topbar-upload fallback here) |
| 40 | Reach Step 3 in a workspace where the user is view-only | The **+ New** pill never appears (permission-gated `data-visible`); after ~4 s the flow returns to the Step 3 card |

## Across the whole flow

| # | Case | Expected |
|---|---|---|
| 41 | Click the dimmed area during either walkthrough | Absorbed. The card pulses, the create form keeps what was typed, the walkthrough stays on its sub-step. NO modal, no way out |
| 42 | Click the dimmed area on any card | Same: pulse, nothing else |
| 43 | Click desk chrome the current step does not point at (sidebar row, another topbar control) | Absorbed by the scrim — the flow owns the screen, so the desk cannot be operated around it |
| 44 | Press **F5** / **Ctrl+R** / **Cmd+R** mid-flow | The page does NOT reload; the card pulses. Try each modifier combination |
| 44a | Press **Ctrl+Shift+R** (hard reload) | Also blocked — same intent, same loss |
| 44b | Type a workspace name containing **r** in the create form | The letter types normally. The guard runs in capture over the whole window, so this is the case that proves it is not eating ordinary keys |
| 44c | Press **Ctrl+F5** | NOT blocked — the browser keeps that binding. Documented ceiling, not a regression |
| 45 | Click the browser's **reload button** | NOT blocked, and it triggers case 47's native dialog instead. Nothing in a page can see that control |
| 46 | Press the browser **Back** button mid-flow | Nothing happens: the URL does not change, the desk is not torn down, the card pulses. Press it repeatedly — the trap re-arms every time |
| 46a | Press **Forward** after that | Also inert |
| 46b | Complete the flow, then press **Back** | Normal navigation resumes — the guard hands its history entry back on finish, so the flow does not cost an extra Back press for the rest of the session |
| 47 | Close the tab, or navigate away via the address bar | The browser's native "Leave site?" dialog appears. Choosing Leave still leaves — this is a deterrent, not a block, and the flow does not come back afterwards |
| 47a | Same, but before interacting with the page at all | The dialog may NOT appear: browsers ignore `beforeunload` until the user has interacted. Expected |
| 48 | Replay the tour from **Get help → Product Tour** on an established account | The activation flow does NOT appear when the tour ends |
| 49 | A campaign user (`?utm_campaign=free-storage`) also eligible for the reward flow | Only the reward flow runs; activation stands down entirely |
| 49b | **No flow running**: create a share workspace from the topbar New menu | The secure-share dock opens as it always did. The override is opt-in, so every ordinary creation path is untouched |
| 49c | Same from the sidebar **Add new** | Same — the dock opens |
| 49d | reward-flow's Step 1 (`?reward=1`) with an external workspace | The dock opens and its own perm phase runs, unchanged. The override is never set for that flow |
| 49e | With activation running, create a share workspace from the **sidebar workspace-list** rather than the topbar | The dock opens — that path launches its own dialog and bypasses the desk service carrying the override. The guide still spotlights the dock and completes on the long budget; Step 2 falls back to the card |
| 49a | The same account loaded with `?activate=1` | The opposite: activation runs and the reward flow stands down, so the flag is never swallowed |
| 50 | Resize the window during Step 2 and either walkthrough | Cutout and coach re-measure and stay on target; the Step 2 card follows the topbar Invite button |
| 51 | Narrow the viewport below 768px | Card and modal take the mobile gutter and stay centred, whatever the step measured |
| 52 | Reach the closing modal having pressed **Skip for now** | It appears normally, with the same copy — Step 3 is the only step this flow insists on, so a run with no invitation still completes, and the copy deliberately does not claim one was sent |

## Regression cases for the shared-lib extraction

The reward flow now draws its coach through `libs/guided-flow`, so its own
walkthroughs need a pass:

| # | Case | Expected |
|---|---|---|
| R1 | reward-flow Step 1 (`?reward=1`), each sub-step | Coach renders with the same wording, position and buttons as before |
| R2 | reward-flow Step 1, the dropdown sub-step | Sibling menu items still grey out and are unclickable (the class behind this was renamed) |
| R3 | reward-flow Step 3, the "folder" and "files" beats | **Next** appears, and reads "Next" in a non-English locale (its label is now passed explicitly) |
| R4 | reward-flow Step 3, **Back** on a failed upload | Still rewinds to "+ New" |
| R5 | reward-flow Step 3, coach beside the progress window | Still sits above it, not over the rows |

## What is verified automatically

`node --test tests/` covers the pure decisions:

- `guided-flow-anchor.test.js` — coach placement: below/above/clamped, the
  tall-panel margin choice, the 60%-height threshold, and both x clamps.
- `guided-flow-steps.test.js` — step-name suffix stripping and
  workspace-descriptor parsing (including the `hub/0` placeholder and junk
  storage).
- `guided-flow-geometry.test.js` — the union box the cutout uses when Step 2's
  popup has a dropdown open: below, beside, several at once, zero-size rects
  ignored, nested rects changing nothing.
- `activate-workspace-upload-beats.test.js` — the Step 3 beat table, including
  every case that must HOLD rather than rewind.

Everything else in the list above needs a browser, a real workspace and a real
upload, so it is here rather than in a test file.

Note: `tests/file-thread-move-route.test.js` fails on this branch and on
`preview` alike — it requires `builtins/media/file-thread-move-route`, which no
longer exists. Unrelated to this work.
