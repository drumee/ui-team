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

| # | Case | Expected |
|---|---|---|
| 1 | Finish the automatic tour (`?tutorial=1`) | Step 1 card, centred, 1 of 2 progress segments lit, single **Continue** button and no Back |
| 1a | Load `?activate=1` on a plain login | Same card, ~2s after home settles |
| 1b | `Desk.startActivateWorkspace()` in the console | Same card, immediately |
| 2 | Click **Continue** | Cutout on the topbar **New** button; coach reads "Click New to get started" |
| 3 | Click **New** | The create flyout expands by itself; cutout narrows to the **Workspace** row; the sibling rows are greyed and unclickable |
| 4 | Click **Workspace** | Cutout wraps the whole create-workspace card (rounded corners included, no bright band) |
| 5 | Create a **team** workspace | Permission panel slides in; cutout follows it in as it animates; coach reads "Add team members or Close to continue" with no Back |
| 6 | Close that panel | Step 2 card, centred, both progress segments lit, button reads **Open workspace** |
| 7 | Create an **external (share)** workspace instead | Secure-share dock opens (a lazily loaded window — allow several seconds); coach reads the external wording; closing it lands on Step 2 |
| 8 | Create a **personal** workspace instead | No follow-up panel at all; Step 2 immediately |
| 9 | Invite a member from the panel at case 5, then close the confirmation | Step 2 — same as closing the panel without inviting. Unlike reward-flow there is no invite step, so sending one changes nothing about where the flow goes |
| 10 | **Back** at sub-steps 2/3/4 | Steps back one sub-step (form → dropdown → New button); Back at the New button leaves the walkthrough for the Step 1 card |
| 11 | Click **Open workspace** | The workspace opens; the whole screen dims with no hole; coach reads "This is your workspace" with **Back** and **Next** |
| 12 | Click **Next** | Cutout narrows to the folder **+ New** pill |
| 13 | Click **+ New** | Cutout narrows to **From device**; the other dropdown rows are greyed |
| 14 | Click **From device**, pick a file | OS picker opens; progress window appears with the cutout on it and the coach above it (never over the rows) |
| 15 | Wait for the upload to finish | Cutout moves to the files panel with the new file visible; coach's **Next** becomes enabled |
| 16 | Click that **Next** | The workspace closes by itself, the desk is back at Home, and the "Your workspace is ready" modal appears over a single-depth dim |
| 17 | Click **Back to home** | Everything disappears; desk is usable; no invisible blocker over it (click a sidebar row to confirm) |
| 18 | Upload several files at once | The last beat is reached on the first file, but **Next** stays disabled and greyed until the whole batch is done |
| 19 | Cancel or fail one file in the batch | Coach switches to the "Some files didn't upload" line; **Next** disabled |
| 20 | Press **Back** on that failed beat | Progress window closes and the walkthrough rewinds to the **+ New** pill (not out to the card) |
| 21 | Retry the failed file successfully instead | Coach returns to the normal wording and **Next** enables — the failure is read live, not latched |
| 22 | **Back** at any beat of case 11–15 | Leaves the walkthrough for the Step 2 card; the workspace stays open; **Open workspace** re-enters the walkthrough from the top |
| 23 | Click the dimmed area during either walkthrough | "Leave setup?" modal, above the create form / workspace window; **Continue** resumes exactly where it was, with anything typed in the form intact |
| 24 | Click the dimmed area on either card | Same modal |
| 25 | **Leave setup** during the Step 1 walkthrough with the create form open | Form closes with the flow; no leftover full-viewport blocker over the desk |
| 26 | **Leave setup** during the Step 1 walkthrough on the external branch | The secure-share dock closes too |
| 27 | **Leave setup** during Step 2 | The workspace window and any progress window close; desk back at Home |
| 28 | Press **F5** mid-flow | The page reloads with NO "Leave site?" prompt — the flow does not guard the browser — and does not come back. Any workspace already created is still there |
| 29 | Press the browser **Back** button mid-flow | Navigates normally, no interception |
| 30 | Delete the Step 1 workspace in another tab, then click **Open workspace** | After ~4 s the flow returns to the Step 2 card so the button can be pressed again (the descriptor is kept — there is no topbar-upload fallback here) |
| 31 | Reach Step 2 in a workspace where the user is view-only | The **+ New** pill never appears (permission-gated `data-visible`); after ~4 s the flow returns to the Step 2 card |
| 32 | Replay the tour from **Get help → Product Tour** on an established account | The activation flow does NOT appear when the tour ends |
| 33 | A campaign user (`?utm_campaign=free-storage`) who is also eligible for the reward flow | Only the reward flow runs; activation stands down entirely |
| 33a | The same account loaded with `?activate=1` | The opposite: activation runs and the reward flow stands down, so the flag is never swallowed |
| 34 | Resize the window during either walkthrough | Cutout and coach re-measure and stay on target |
| 35 | Narrow the viewport below 768px | Card and modal take the mobile gutter and stay centred |

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
- `activate-workspace-upload-beats.test.js` — the Step 2 beat table, including
  every case that must HOLD rather than rewind.

Everything else in the list above needs a browser, a real workspace and a real
upload, so it is here rather than in a test file.

Note: `tests/file-thread-move-route.test.js` fails on this branch and on
`preview` alike — it requires `builtins/media/file-thread-move-route`, which no
longer exists. Unrelated to this work.
