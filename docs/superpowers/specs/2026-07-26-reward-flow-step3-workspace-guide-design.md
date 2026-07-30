# Reward flow — Step 3 guided upload walkthrough

Date: 2026-07-26
Status: design, approved for planning
Supersedes the Step 3 section of `2026-07-23-reward-onboarding-flow-design.md`

## Problem

The legacy Step 3 path originally spotlighted the desk topbar's standalone
Upload button and waited for any upload. The merged topbar now uses `New` as
that spotlight anchor while the card still dispatches `_e.upload` directly.
The file lands wherever the desk context happens to point — usually Home, not
the workspace the user just created in Step 1. The step teaches nothing about
where files live.

Step 3 becomes a guided walkthrough, modelled on the Step 1 walkthrough: it
reopens the Step 1 workspace and walks the user to the upload control *inside*
it, so the first file lands in the workspace they just made.

## Flow

```
step3              centered card, no cutout, [ Open workspace ]
  │                  (mirrors step1's centered card)
  │ click → Wm.loadWorkspace(step-1 workspace)
  ▼
step3_guide        walkthrough; each sub-step paints a cutout + coach
  │
  ├─ folder   cutout = .window-folder__ui                 coach + [Next]
  ├─ new      cutout = .window-folder-topbar__new-ctrl    DOM-driven
  └─ device   cutout = .window-button__dropdown-menu__item--from-device
              sibling rows greyed                         DOM-driven
  │
  │ OS file picker → RADIO_MEDIA _e.uploaded
  ▼
congrats
```

`step3_waiting` is retained **only** for the fallback path (see Fallback).

## Components

### 1. `guide-core.js` (new) — shared reconcile engine

Extracted verbatim from today's `guide.js`, which keeps its behaviour:

- `hasDom()`, `visible()`, `firstVisible()` module helpers
- `MutationObserver` on `document.body` → `_scheduleReconcile()` debounced at
  `RECONCILE_DEBOUNCE_MS = 30`
- backward-move grace (`BACKWARD_GRACE_MS = 500`) so the gap between one
  surface closing and the next opening does not rewind the spotlight
- `_pin(sub)` / `_unpin()` with `PIN_TIMEOUT_MS = 1200`
- `_position()` with the `sub:left:top:w:h` signature dedup
- `_disableOthers()` / `_enableOthers()` using the `reward-guide-disabled` class
- `start()` / `stop()` lifecycle, `window resize` listener

Subclass contract — a concrete guide supplies:

| Member | Purpose |
|---|---|
| `SEL` | selector table |
| `ORDER` | `{sub: rank}` for the forward/backward comparison |
| `_resolveSub()` | read the DOM, return the sub-step name (or `null`) |
| `_targetEl()` | element to spotlight for the current sub-step |
| `_coachFor(sub)` | `{text, showBack, showNext}` |
| `back()` | returns true when handled, false to exit the guide |

`_reconcile()` stays in the core and calls `_resolveSub()`. Step 1's perm-phase
special case moves into its own `_resolveSub()` override — the core keeps no
knowledge of it.

### 2. `guide.js` (step 1) — becomes a subclass

Behaviour unchanged. Only the engine members move out. This is the one
regression risk in the change; it is covered by re-testing the Step 1
walkthrough end to end (add → menu → form → perm, plus Back at each).

### 3. `guide-upload.js` (new) — step 3 subclass

```js
const SEL = {
  folder:     ".window-folder__ui",
  newCtrl:    ".window-folder-topbar__new-ctrl",
  fromDevice: ".window-button__dropdown-menu__item--from-device",
  otherRows:  ".window-button__dropdown-menu__item:not(.window-button__dropdown-menu__item--from-device)",
};
const ORDER = { folder: 1, new: 2, device: 3 };
```

`_resolveSub()`:

1. `fromDevice` visible → `device`
2. `newCtrl` visible **and** `_nextPressed` → `new`
3. `folder` visible → `folder`
4. otherwise `null`

`null` means "hold": `_reconcile()` leaves the current sub-step and spotlight
untouched rather than clearing them. This covers the window still mounting, and
the moment the dropdown closes while `data-visible` is being re-synced.

The `_nextPressed` latch is what makes the `folder` beat survive. See
"Why `folder` needs a Next button" below.

`back()` returns `false` for every sub-step: Back exits the walkthrough to the
Step 3 card and leaves the workspace open. Deliberately simpler than Step 1's
step-back, which needs `reward-set-add-menu` on the desk to drive the dropdown;
the equivalent here would mean reaching into `window_folder`'s `new-ctrl` part
from the reward flow. Not worth the coupling for three sub-steps with no
destructive surfaces.

### 4. Capturing the Step 1 workspace

`media/form/index.js` already broadcasts `workspace:refresh` at both creation
sites. It gains a descriptor payload:

| Type | Payload |
|---|---|
| team / share | `{workspace: {hub_id: hub.hub_id \|\| hub.id, nid: hub.actual_home_id \|\| hub.home_id, area: hub.area \|\| area, filename}}` |
| personal | `{personal: 1, workspace: {hub_id: Visitor.id, nid: created.nid \|\| created.id, area: "personal", filename}}` |

The personal shape matches what `workspace-list/index.js:163-171` already builds
for a home-root folder row, so `Wm.loadWorkspace` resolves the folder itself and
not the hub home root.

`onWorkspaceCreated()` stores it (only while `_step === "step1_guide"`, the
existing guard) into `this._workspace` and `localStorage.reward_workspace`.

`_startGuide()` clears it, alongside the existing `_resetInviteLatch()` call and
for the same reason: a re-run of the Step 1 walkthrough may create a different
workspace, and Step 3 must open the one this run created. `_finish()` clears it
too.

### 5. Card and skeleton

`card.js` gains a `STEP3_GUIDED` overlay, in the same shape as the existing
`STEP2_SATISFIED`:

- `primaryLabel` → `LOCALE.REWARD_FLOW_OPEN_WORKSPACE` / "Open workspace"
- `primaryService` → `"reward-open-workspace"`
- `desc` → `LOCALE.REWARD_FLOW_STEP3_GUIDED_DESC` /
  "Open the workspace you just created and upload your first file into it."

Applied when `base === "step3" && ui.hasStep1Workspace()`.

`skeleton/index.js`: `targeted` excludes a guided step 3, exactly as it already
excludes a satisfied step 2 — so no cutout is rendered over
`.desk-module-topbar__new-workspace-btn` and the anchor gets `data-notarget="1"`,
centring the card via the existing skin rule.

`_applyStepTarget()` resolves no target for a guided step 3, same branch as the
satisfied step 2.

### 6. Coach "Next" button

`skeleton/coach.js` gains an optional `showNext` that renders a primary button
firing `"reward-guide-next"` beside Back. Step 1 passes `showNext: false`
everywhere, so its coach is unchanged.

## Why `folder` needs a Next button

Every other sub-step in both walkthroughs advances because a surface *appears*
— the dropdown opens, the form mounts. The folder `New` pill is already on screen the
moment the workspace window renders, so a purely DOM-driven `_resolveSub()`
would resolve `new` in the same tick as `folder` and the "this is your
workspace" beat would never be seen.

`folder`'s coach therefore carries an explicit **Next**, which sets
`_nextPressed` and lets `_resolveSub()` promote to `new`. This is the only
sub-step in either guide with a Next.

## Fallback

Step 3 runs its legacy behaviour — cutout on
`.desk-module-topbar__new-workspace-btn`, `Upload` primary button,
`step3_waiting` — when
`localStorage.reward_workspace` is absent or unparseable. That covers:

- a page reloaded straight into step 3 in a browser that never stored one
- a workspace deleted between step 1 and step 3
- any future path that reaches step 3 without going through step 1

`Wm.loadWorkspace` failing is also caught: if `.window-folder__ui` has not
become visible within **4000 ms** of `reward-open-workspace`, the flow drops to
the legacy variant rather than stranding the user on a dead card.

A second gate: `.window-folder-topbar__new-ctrl` carries `data-visible="0"`
until `syncNewCtrlVisibility()` confirms `canUpload()`. The owner of a
just-created workspace always passes, but `visible()` already returns false for
a `data-visible="0"` element (it is `display:none` in the skin), so the guide
simply holds on `folder` and the same 4 s timeout applies.

## Completion

`onUploadDone()` currently requires `_step === "step3_waiting"`. It accepts
`step3_guide` too, and stops the guide before opening congrats. The upload
signal itself is unchanged (`RADIO_MEDIA _e.uploaded`, emitted by both
`media/uploader` and `window/upload-progress`).

## State and storage

| Key | Written | Cleared |
|---|---|---|
| `reward_step` | every `_goto` | `_finish` |
| `reward_invited` | Step 1 panel invite | `_finish`, `_startGuide`, mount at step 1 |
| `reward_workspace` | Step 1 workspace created | `_finish`, `_startGuide` |

New step value `step3_guide` joins `step1_guide`. **`initialize()` must be
fixed for this.** Today it does:

```js
const stored = (lsGet(KEY_STEP) || "").replace("_waiting", "");
this._step = STEPS.includes(stored) ? stored : "step1";
```

`"step3_guide"` is not in `STEPS`, so it would fall through to **`step1`** and
throw the user back to the beginning of the flow. (`step1_guide` survives this
only by coincidence — its fallback happens to be the right answer.) The resume
line becomes:

```js
const stored = (lsGet(KEY_STEP) || "").replace(/_(waiting|guide)$/, "");
```

so `step3_guide` resumes at `step3` — the centered card, which is the correct
resume point since the workspace window is long gone.

## Copy (English; five other locales follow)

| Key | Text |
|---|---|
| `REWARD_FLOW_OPEN_WORKSPACE` | Open workspace |
| `REWARD_FLOW_STEP3_GUIDED_DESC` | Open the workspace you just created and upload your first file into it. |
| `REWARD_FLOW_GUIDE_FOLDER` | This is your workspace. Everything you upload here stays with your team. |
| `REWARD_FLOW_GUIDE_NEW` | Click "New" to add your first file. |
| `REWARD_FLOW_GUIDE_FROM_DEVICE` | Choose "From device" to pick a file. |
| `REWARD_FLOW_NEXT` | Next |

## Testing

Cannot be click-tested on this box: it needs a real campaign signup, a real
`desk.create_hub`, and a real upload. Verification is limited to `node --check`,
a standalone `sass` compile, and JSON validation of the locale files — stated
plainly rather than implied.

Manual test matrix for whoever runs it against a real instance:

1. internal workspace → step 3 guided → folder / new / device → upload → congrats
2. external workspace → same
3. personal workspace → same, folder opens the personal folder not Home
4. reload at step 3 → card is the guided variant (descriptor persisted)
5. `localStorage.removeItem("reward_workspace")` then reload at step 3 → legacy
   variant with the cutout anchored to the topbar `New` control
6. Back at each sub-step → returns to the step 3 card, workspace stays open
7. Step 1 walkthrough end to end, unchanged (guide-core regression check)

## Out of scope

- Verifying the uploaded file actually landed in the workspace (the flow reacts
  to `_e.uploaded` wherever it fired; scoping the signal to a hub is a separate
  change to the upload emitters)
- Drag-and-drop onto the grid as an alternative upload path
- Any server-side grant; the flow remains UI-only
