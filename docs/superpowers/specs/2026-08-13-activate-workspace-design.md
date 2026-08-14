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

```
step1 → step1_guide → step2 → step2_guide → done
```

| State | What is on screen |
|---|---|
| `step1` | "Create your workspace" card, centred, 1 of 2 progress segments lit |
| `step1_guide` | walkthrough: topbar **New** → **Workspace** → the create form → the follow-up permission panel |
| `step2` | "Upload your first file" card, both segments lit, button opens the workspace |
| `step2_guide` | walkthrough inside that workspace: **+ New** → **From device** → the upload → the files panel |
| `done` | "Your workspace is ready" modal, then the flow closes for good |

There are no `*_waiting` states. reward-flow needs them because it hands the user
to surfaces it does not own and has to sit beside them; here Step 1 always ends
with a workspace descriptor in hand, so Step 2 is always the guided
in-workspace path.

That has a large consequence: **both cards are centred**, so the whole
target-measuring apparatus reward-flow carries — `_applyStepTarget`,
`_trackStepTarget`, `_watchStepTarget`, `_unionOverflow`, the resize listener and
the `MutationObserver` that keeps a card pinned under a moving topbar control —
does not exist here. Neither card points at a topbar control: Step 1's action is
"start the walkthrough" and Step 2's is "open the workspace".

### Step 1 — all three workspace types end the same way

reward-flow branches on `personal` / `internal` / `external`, because the
permission panel that follows an *internal* create is where members are invited
and that IS its Step 2, so the flow is handed over mid-walkthrough. Step 2 here
is an upload, which no branch of the create can satisfy early, so all three
simply carry on:

- **personal** — a folder at the home root, nothing opens after it → Step 2 at
  once.
- **internal / external** — the guide's `perm` phase spotlights the follow-up
  surface (permission panel, or the secure-share dock) and completes when the
  user closes it → Step 2.

`onInvitePanel`, `_awaitPanelClosed`, `_resumeCreateForm`, `_reopenInvitePanel`
and the whole invite-surface vocabulary have no counterpart here.

### Step 2 — the guided path only

`_e.uploaded` advances the *guide*, it does not finish the flow: the last two
beats show the upload in progress and then the files panel it landed in.
Finishing on the media event would tear the workspace down in the same frame the
first file arrived, and the user would never see the thing the step was for.

Failure handling is read live from the DOM (Retry / cancelled rows), so a
successful retry clears it by itself. `Back` on a failed beat rewinds to **+
New** rather than dropping out to the card.

If the workspace window never mounts, a 4s timer returns the user to the Step 2
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
| `skin/` | `.guided-flow-disabled`, and the wrapper-modal overlay flattening |

Two things were split rather than moved. `STEPS` stays with each flow —
reward-flow has three card steps, this has two, and a shared list would be one
of them imposed on the other. reward-flow's scratch key and its legacy-key purge
stay with it too; they are its own history.

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

## What is not here

- No campaign/UTM arrival tracking (`libs/campaign.js`).
- No eligibility or cap check, and no org-user exclusion.
- No invite step, neither the panel route nor the popup route.
- No storage grant, no slot counting, no sold-out screen.
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

## Testing

Pure decisions are unit-tested under `tests/` with `node:test`: coach placement
geometry, the step-name helpers, descriptor parsing, and the Step 2 beat table
(including every case that must HOLD rather than rewind).

Everything else needs a browser, a real `desk.create_hub` and a real upload —
none of which this dev box has — so it is a manual matrix:
`2026-08-13-activate-workspace-manual-test.md`. That matrix also carries five
regression cases for the reward flow, whose coach now comes from the shared lib.
