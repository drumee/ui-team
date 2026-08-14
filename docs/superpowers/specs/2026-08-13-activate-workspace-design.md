# activate-workspace — design

**Date:** 2026-08-13
**Scope:** new `builtins/widget/activate-workspace`, new `libs/guided-flow`,
`modules/desk` entry point

## Goal

Take a brand-new account from an empty desk to a workspace with a file in it,
by walking the user through the real desk chrome.

It is the practical half of onboarding. The 6-step product tour
(`modules/desk/tutorial`) SHOWS the product on a mock desk; this has the user
build the real thing, and runs immediately after it.

The mechanics already exist. `reward-flow` walks these same two surfaces for the
"Claim your free storage" campaign, and does it well — a self-healing reconcile
engine over the live DOM, a spotlight cutout, a coach callout. What does not
carry over is everything that makes that flow a campaign: an email CTA to arrive
from, a server-side eligibility gate, a capped slot to win, a funnel to report
into. This widget is evergreen and has no prize.

## Steps

Three card steps, the same shape reward-flow set:

```
step1 → step1_guide → step2 → step2_waiting → step3 → step3_guide → done
```

| State | What is on screen |
|---|---|
| `step1` | "Create your workspace" card, centred, 1 of 3 progress segments lit |
| `step1_guide` | walkthrough: topbar **New** → **Workspace** → the create form → the follow-up permission panel |
| `step2` | "Invite a teammate" card under the topbar Invite button; **Invite member**, **Back**, and **Skip for now** |
| `step2_waiting` | a real surface is open — the members panel or the invite popup — and the card waits beside it |
| `step3` | "Upload your first file" card, centred, 3 segments lit, button opens the workspace |
| `step3_guide` | walkthrough inside that workspace: **+ New** → **From device** → the upload → the files panel |
| `done` | "Your workspace is ready" modal, then the flow closes for good |

`step2_waiting` exists for the reason reward-flow's does: Step 2 hands the user a
surface the widget does not own and has to sit beside it. That brings the
target-measuring apparatus with it — `_applyStepTarget`, `_trackStepTarget`,
`_watchStepTarget`, `_unionOverflow`, the resize listener and the body-wide
`MutationObserver` that keeps the card pinned under a moving topbar control —
ported from reward-flow with the selectors rebound. The union arithmetic inside
`_unionOverflow` is the one part pulled out pure, into
`libs/guided-flow/geometry`.

Steps 1 and 3 are centred (`data-notarget`); only Step 2 hangs off a topbar
control.

### Step 2 is skippable

**The one place this diverges from reward-flow's shape.** `activate-skip-invite`
sits under the footer on both the `step2` card and the `step2_waiting` variant
and moves the flow forward to Step 3, progress bar included.

Inviting is the single step of the three a user can be unable to perform. A
brand-new account — the entire audience for a flow chained to the post-signup
tour — is on the free solo plan, and the desk's invite path declines to open the
popup at all for those accounts (`libs/billing isFreeSoloPlan`, checked in
`_openInvitePopup`). A solo founder may also simply have nobody to invite yet. A
step that can be neither completed nor left is worse than an optional one.

Two consequences, both accepted:

- The widget checks `isFreeSoloPlan()` itself before firing `invite-member`, and
  when it is true it stays on the card instead of entering `step2_waiting` for a
  popup that will never be fed. The desk still shows its own plan-limit notice.
- **Step 3 is the only mandatory second step.** A user can reach the closing
  modal having created a workspace and uploaded a file but never invited anyone.
  That is intended; it matters if a completion funnel is ever added.

### Step 1 — the three workspace types end differently

The same branching reward-flow does, because the difference is which surface the
create opens next:

- **personal** — a folder at the home root; nothing opens after it → Step 2's
  card.
- **internal** — opens the permission panel, which is where members are invited,
  so that panel IS Step 2. `guide-create` hands the flow over the moment it
  appears (`_checkInvitePanel` → `onInvitePanel`) and stops; the orchestrator
  shows the Step 2 card beside it.
- **external** — opens the secure-share dock, which is sharing rather than
  membership. Not Step 2, so the perm phase runs to completion → Step 2's card,
  whose Invite opens the popup.

### Step 2 — two routes in

**Route A, the permission panel.** Nothing reports it (the desk reports the
invite popup for itself but not this), so `guide-invite` observes the document.
Success is `permission_restricted`'s own `invitation:sent` broadcast, never the
presence of a confirmation — a *failed* invite raises a `window_info` of its own,
so sniffing for one would read a failure as a completed step.

Three exits, and only the first matches reward-flow:

| Exit | Lands on |
|---|---|
| an invitation went out | the confirmation is dismissed → **Step 3** |
| closed with nothing sent | the **Step 2 card** |
| never appeared (8s) | the **Step 2 card** |

reward-flow rewinds the middle case to Step 1's create form, on the reasoning
that closing the panel is a Back. This flow does not: that orphans the workspace
the user just made and loops a user who has nobody to invite. Forward to the
card, where Back is still one press away and Skip is right there.

**Route B, the invite popup.** The desk owns it and relays both signals
(`onInvitationSent`, `onInvitePopupClosed`), so the only thing left to watch is
the confirmation that replaces it — `awaitToastDismissed`, with a 4s fallback so
a toast that never shows cannot strand a finished step.

There is no `_reopenInvitePanel`: Step 3 → Back lands on the plain Step 2 card.

### Step 3 — the guided path only

`_e.uploaded` advances the *guide*, it does not finish the flow: the last two
beats show the upload in progress and then the files panel it landed in.
Finishing on the media event would tear the workspace down in the same frame the
first file arrived, and the user would never see the thing the step was for.

Failure handling is read live from the DOM (Retry / cancelled rows), so a
successful retry clears it by itself. `Back` on a failed beat rewinds to **+
New** rather than dropping out to the card.

If the workspace window never mounts, a 4s timer returns the user to the Step 3
card so the button can be pressed again. The descriptor is deliberately KEPT —
reward-flow drops it and falls through to a topbar-upload card, and there is no
such fallback here, so forgetting it would leave a card whose only button has
nothing to open.

## The shared lib

`libs/guided-flow/` holds what both flows use. It was extracted rather than
reached into across widget directories, because reward-flow is a campaign widget
that will be retired and a permanent widget must not depend on its directory
surviving.

| File | Contents |
|---|---|
| `guide-core.js` | the reconcile engine: observer, debounce, backward grace, pin, spotlight dedup, sibling greying |
| `steps.js` | `baseStep` / `isWaiting` / `isGuiding` — the suffix helpers |
| `descriptor.js` | workspace-descriptor parsing and validation |
| `storage.js` | localStorage primitives and per-user key scoping |
| `coach.js` | the coach callout skeleton |
| `anchor.js` | coach placement geometry, pure |
| `geometry.js` | `unionRects` — the box the cutout takes when a step's surface is two elements |
| `skin/` | `.guided-flow-disabled`, and the wrapper-modal overlay flattening |

**Re-confirmed under the three-step shape.** Nothing in this list depends on how
many steps a flow has, so reinstating Step 2 changed none of it. `geometry.js`
was added afterwards, when Step 2's popup brought the dropdown-union problem back
with it.

Two things were split rather than moved. `STEPS` stays with each flow — both
happen to have three card steps today, but they are each flow's own vocabulary
and a shared list would be one imposed on the other. reward-flow's scratch key
and its legacy-key purge stay with it too; they are its own history.

Two touches to reward-flow's rendering path, both behaviour-preserving:
`DISABLED_CLASS` is renamed `guided-flow-disabled` (its global rule now ships
with the engine that applies it, so a flow cannot acquire the class without the
styling), and the coach's Back/Next services are caller-supplied with no
default — a coach whose buttons quietly fired another widget's services would
render perfectly and do nothing. Its Next label is caller-supplied for a
narrower reason: `REWARD_FLOW_NEXT` is translated in languages where the generic
`LOCALE.NEXT` is still sitting at its English value.

Deliberately NOT extracted: `spotlight()` itself, the portal/overlay-capture
pair, the drop guard, and modal open/close. They are 15–40 lines each, they
differ between the flows, and a base class shaped around a campaign widget is
the wrong thing to leave behind.

## Entry point

`modules/desk` `_maybeStartActivateWorkspace()`, chained in `_afterHomeSettled`
after `_maybeStartRewardFlow()` and before LAUNCH30.

**It runs only after an AUTOMATIC product tour** — the post-signup one, or
`?tutorial=1`. That is the whole gate, and it is what makes the flow one-shot
with no latch stored anywhere: the automatic tour happens once per signup, and
nothing else re-triggers this. `_tutorialWasAutomatic` is recorded when the tour
MOUNTS, because the flag it reads (`_tourReturnsToHelp`) is consumed in that same
`onPartReady` and is gone by the time the tour is destroyed.

A tour replayed from **Get help → Product Tour** is excluded: handing a
months-old account a "create your first workspace" walkthrough because they
rewatched the tour would be nonsense.

**It stands down when the reward flow mounted.** Both open with the same
create-workspace walkthrough, and running them back to back would ask the user
to build two workspaces. Reward-flow wins: it is campaign-gated, time-limited
and has a prize attached.

`_homePopupsBusy()` counts this flow, so the invited-workspace dialog cannot
stack on top of it.

### Two relays the desk had to grow

Step 2's popup route depends on signals the desk owned but sent only to the
reward flow, both hardcoded to `this._rewardFlow`: the `invitation-sent` case,
and the popup's own destroy hook. Both now tell whichever flow is running. They
cannot both be up — activation stands down when the reward flow mounts — so at
most one of each pair does anything.

Nothing else in the desk changed: the chain order, `_homePopupsBusy`, the force
flag and the console entry are as they were.

### Starting it by hand

The automatic trigger fires once per account, so testing needs a way in that
does not require a fresh signup. Two, mirroring `?reward=1`:

- `#/desk?activate=1` — skips the tour gate. Such a load also makes the reward
  flow stand down, so the flag cannot be swallowed by an account that happens to
  hold a `reward_claim` row.
- `Desk.startActivateWorkspace()` — `window.Desk` is the live desk module, so
  this runs the flow from the console at any time, repeatedly.

A forced run is an ORDINARY run, which is the difference from `?reward=1`. That
flag has to be threaded into the reward widget so a test cannot write to the
campaign funnel or burn one of its limited slots; there is no funnel here, no
prize and no latch, so nothing about a forced run differs and the widget is
never told it was forced.

## Exits

The in-app guard is kept: clicking the dimmed backdrop — the vignette on a card,
`__guide-scrim` during a walkthrough — raises "Leave setup?". That click is as
often a miss as a decision, since the overlay covers the screen and the thing
the user meant to press is often just outside the hole.

`ExitGuard` and `beacon.js` are NOT ported. reward-flow traps F5, hijacks the
Back button and raises the browser's native "Leave site?" dialog because
abandoning it forfeits a capped prize the user is three clicks from claiming.
Nothing is forfeit here, so the browser's own controls are left alone: a refresh
mid-flow lands the user back on their desk with whatever they have already built
still there. The beacon existed only to post a status the unload would otherwise
cancel, and there is no status to post.

**Re-confirmed under the three-step shape.** This was decided on "nothing is
forfeited by leaving an onboarding flow", which reinstating Step 2 does not
change — if anything a skippable step makes the case stronger. The `step2_waiting`
state does gain a guard of its own, but an in-app one: the backdrop beside the
panel or popup raises the same "Leave setup?" card, and routes a click that
landed on the card underneath to the control the user aimed at rather than
answering with the prompt.

## What is not here

- No campaign/UTM arrival tracking (`libs/campaign.js`).
- No eligibility or cap check, and no org-user exclusion.
- No storage grant, no slot counting, no sold-out screen. The closing modal is
  the only terminal success screen, and a completion cannot be refused.
- No funnel: nothing is reported to any service. Client-only, and today that
  means no telemetry at all.
- No persistence: not the step, not the workspace descriptor. The flow is one
  session long.

## Accepted consequences

**An abandoned run is not retried.** Leaving the flow — through the guard, or by
reloading — ends it, and nothing brings it back, because nothing re-triggers it
and no per-user state records that it was missed. This is the direct cost of
having no server state, and it is a product-visible choice rather than an
oversight.

**No activation funnel exists.** How many users finish this flow is currently
unanswerable. If product wants the number, the smallest honest addition is an
`{event, step}` log behind a new service; funnel parity with `reward_claim` is a
much larger change and only worth it for cross-widget reporting.

**Copy is English-only.** `ACTIVATE_WS_*` keys are added to `locale/en.json`
only; the other six locales fall back to English until they are translated.

**Step 3 is the only mandatory second step**, because Step 2 carries a Skip. See
"Step 2 is skippable" above.

**Back out of Step 2 to Step 1 and press Continue, and the first workspace is
orphaned** — `_startCreateGuide` clears the descriptor so Step 3 opens the one
this run made, leaving the earlier one behind on the server and in the sidebar.
reward-flow behaves identically; matched rather than diverged from, deliberately.

## Open

**The terminal screen** is a modal ("Your workspace is ready" + one button). The
alternative — closing on the walkthrough's last Next with no screen at all — is
still on the table and remains a two-line change.

## Testing

Pure decisions are unit-tested under `tests/` with `node:test`: coach placement
geometry, the step-name helpers, descriptor parsing, the dropdown-union box, and
the Step 3 beat table (including every case that must HOLD rather than rewind).

Everything else needs a browser, a real `desk.create_hub`, a real invitation and a
real upload — none of which this dev box has — so it is a manual matrix:
`2026-08-13-activate-workspace-manual-test.md`. That matrix also carries five
regression cases for the reward flow, whose coach now comes from the shared lib.
