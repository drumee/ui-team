# Reward flow — refresh, Back and tab close

**Date:** 2026-08-08
**Status:** approved
**Touches:** ui-team (phase 1), then schemas + server-team + ui-team + analytics-ui (phase 2)

## Problem

Every way out of the reward walkthrough that happens *inside* the app already
asks "Don't drop now" — the vignette on an active card step, `__guide-scrim`
during either walkthrough, and the backdrop beside a Step 2 surface
(2026-07-27-reward-flow-step2-drop-guard-design.md).

Three ways out walk past all of it: **F5**, **Back**, and **closing the tab**.
The first two are the common ones during a walkthrough that has taken over the
screen. Neither the flow nor the user gets any say — the run disappears mid-step
with no acknowledgement.

The funnel has the mirror-image problem. An abandon is only ever recorded when
the user says so in-app, so a closed tab leaves the row at `started` forever and
the dashboard cannot tell a user who walked away from one who is still working.
Those are the two populations the campaign is judged on.

## Prior art

Two unmerged local branches, both dated 2026-08-08, each solving one half:

- `feat/reward-flow-exit-guard` (ui-team only) — intercepts what can be
  intercepted and shows the flow's own card.
- `feat/reward-unload-guard` (ui-team + schemas + server-team + analytics-ui) —
  records the abandon on unload, and reworks the status model to make that safe.

They are not rivals. B is the user-facing layer, A is the funnel layer, and A's
recoverable `dropped` is precisely what makes recording an uncatchable tab-close
harmless. This design combines them, shipped in two phases.

## Constraints

**A page cannot render its own UI on unload.** Every engine has ignored custom
`beforeunload` text since 2016 and shows its own wording; `preventDefault()` is
the entire dialog. So the branded card can only be raised for gestures caught
*before* the page starts leaving, and `beforeunload` is a last-resort net.

**`sendBeacon` cannot be used.** Session auth rides on request headers
(`x-param-keysel` / `x-param-<keysel>`, built by `makeHeaders` in
`@drumee/ui-essentials`), and `sendBeacon` cannot set them — a beacon would
arrive unauthenticated with no `uid`. `fetch(..., { keepalive: true })` carries
headers and is specified to outlive the document.

**Refresh and close are indistinguishable at unload time.** No API separates
them. This is what forces the status split in phase 2.

---

# Phase 1 — Exit guard (ui-team only)

Self-contained: no schema change, no DB patching, and it degrades to today's
behaviour if anything is wrong.

## Behaviour

Three signals, one card. The existing "Don't drop now" modal is reused unchanged
— it asks the same question whether raised by a click on the vignette or by F5,
and a second variant would be one more string to translate for no new
information.

| Signal | Caught by | Intent |
|---|---|---|
| F5, Ctrl+R, Cmd+R (+Shift for a hard reload) | `keydown`, capture phase, `preventDefault` | `reload` |
| Back / Forward button | a history sentinel consumed by `popstate` | `navigate` |
| Tab close, Cmd+W, address bar | `beforeunload` → the browser's own dialog | — |

- **Continue** closes the guard and *cancels* the intent. A refresh the user has
  thought better of must not still be waiting to happen behind the card. The
  Back trap is re-armed, since the sentinel was consumed getting here.
- **Drop anyway** ends the flow as it always has, then **carries out what the
  user asked for**: a reload actually reloads, a Back actually goes back.

`beforeunload` shows no card and reports nothing. It exists for the paths
nothing can intercept — Cmd+W, the tab's close box, the address bar — plus the
browsers that refuse to let Cmd+R be cancelled.

### Not watched: cursor leaving the viewport

The classic exit-intent heuristic was built and then removed. It catches more,
but it guesses at an intention rather than reading an action, and it fires just
as readily on someone reaching for a bookmark. A guard that interrupts a
walkthrough on a guess is worse than one that misses a gesture, and the
`beforeunload` net still covers the click it was trying to pre-empt. Both
remaining signals are things the user actually **did**. That is the line this
module holds.

## When the guard is silent

One predicate, `armed()`, gates all three signals:

- the step is not one of the three card steps — `STEPS.includes(baseStep(step))`.
  An **allowlist**, not a denylist of terminal states: a step name the flow does
  not recognise raises no dialog. `baseStep` strips both `_waiting` and
  `_guide`, so the handoffs are still guarded — they are where users most often
  wander off, and excluding them would miss the common abandon. `congrats` and
  `soldout` fall out for free, which matters: a "Leave site?" dialog between a
  user and their dashboard right after they have won is the worst possible
  moment for one. It is also what excludes a **capped** run, which mounts
  straight into `soldout` — offering to talk a user out of leaving a flow they
  were never given would be nonsense;
- `_finishing` — the flow is already on its way out;
- `_dropGuardOpen` — a second F5 while the card is up is swallowed rather than
  restarting its entry animation and replacing the intent being asked about.

Never armed for a `?reward=1` run, matching `_track`.

## Architecture

A new `exit-guard.js` beside `steps.js` / `storage.js` / `workspace.js`.
`index.js` is already ~1900 lines, and the directory's convention is that
anything with a decision worth testing gets its own module, guarded on `typeof
window` so it stays requirable under bare Node.

```
exit-guard.js
  classifyKey(e)      → "reload" | null    pure
  armed(step, flags)  → boolean            pure
  class ExitGuard { start() stop() rearm() resumeNavigate() }
```

`ExitGuard` takes the orchestrator as `ui`, like `RewardGuide` and
`RewardUploadGuide` do, and calls back into one new method, `ui.onExitIntent()`.
It never renders: raising the card stays the orchestrator's job, through the
existing `_openDropGuard()`.

### Why a history sentinel, not a `hashchange` listener

`hashchange` fires *after* the router has navigated, by which point the desk
module — and the flow inside it — is being torn down. There is nothing left to
raise a guard on and nothing to restore it to.

So `start()` pushes a duplicate of the current entry. The first Back press pops
that instead of leaving the desk: the URL never changes, so the router never
runs, and the flow is intact when the guard goes up. `rearm()` re-pushes it when
the user stays.

Two states must never be tidied on teardown, both handled by `_isCurrent()`
(is our marked entry the one the browser is on right now?):

- the flow leaving *through* the sentinel — `resumeNavigate()` owns the history
  from there;
- the app having navigated **on top** of it. This is the one that bites:
  teardown is usually *caused* by a route change, and a blind `history.back()`
  there would drag the user back to the page they just left.

Every `history` call is feature-detected and wrapped: a guard that cannot
manipulate history must still leave the keystroke and `beforeunload` nets
working.

## Funnel in phase 1

Unchanged. "Drop anyway" remains the only abandon gesture and the only writer of
`dropped`. A tab closed past the native dialog still leaves the row at
`started`, which is what lets the flow resume from `reward_claim.step` on the
next login rather than being closed off for a user who only meant to come back
later.

One change to *how* that post is made: `_track("dropped")` is now **awaited**
before the exit fires, raced against `DROP_POST_TIMEOUT_MS` (1500 ms). The exit
can be a reload, and a request still in flight when the page goes is a row the
funnel never sees. The race is what stops a hung network stranding the user on a
guard they have already dismissed — past that, losing the row is the cheaper
failure. A `_leaving` latch makes a double click on "Drop anyway" idempotent.

---

# Phase 2 — Funnel semantics (4 repos)

Ships after phase 1 is deployed and verified.

## `dropped` splits in two

- **`dropped`** — the user left without saying so (an unload we could not
  intercept). **Recoverable**: it rejoins the set that re-opens the flow, so a
  stray F5 cannot cost someone a prize they were three clicks from claiming.
- **`declined`** — the user was asked and said yes ("Drop anyway"). **Terminal.**

Old ladder: `emailed(1) < clicked(2) < started(3) < dropped(4) < missed(5) < done(6)`
New ladder: `emailed(1) < clicked(2) < dropped(3) < started(4) < declined(5) < missed(6) < done(7)`

`dropped` moves *below* `started` because once a dropped user can return, the old
ranking freezes their row: their next `started` post is rejected, so someone
actively working reads as "Dropped" on the dashboard and "In progress"
undercounts by exactly the returning population.

`declined`, `missed` and `done` all outrank it, so neither a decline, a cap
refusal nor a completion can be undone by a late abandon.

## One exception to the ladder

**A `dropped` post is accepted onto a row that is `started`.**

Without it `dropped` could never be written at all: the widget posts `started`
on mount, so every row is already there by the time anyone abandons, and a pure
rank test rejects the very write that records it.

`started` and `dropped` are the only *reversible* states in the funnel — they
say where the user is now, and a user may leave and return freely. Every other
status records a one-time fact (the mail went out, the link was followed, they
said no, the cap refused them, they finished) and none is takeable back. The
exception is scoped to that pair **by name**, so it cannot fire against
`declined`, `missed` or `done`.

## Backfill

Rows already sitting at `dropped` were written under the OLD meaning — people
who pressed "Drop anyway". Under the new semantics they would become eligible
again and be re-offered the flow, silently overriding an explicit "no" from
every one of them.

A one-shot dated patch, `yellow_page/patches/2026-08-08-reward-dropped-to-declined.sql`,
rewrites them:

```sql
UPDATE reward_claim SET status = 'declined', mtime = UNIX_TIMESTAMP()
 WHERE status = 'dropped';
```

Applied **before** the proc change, and never re-run afterwards — past that
point a `dropped` row means an accidental exit and converting it would be
exactly wrong. It is a no-op on this box (`yp.reward_claim` is empty); it exists
for stage and production.

Measured on stage 2026-08-08 rather than assumed: **1 row** to convert, out of
173 — emailed 150, failed 17, done 4, dropped 1, started 1, with 4 of the 100
slots taken. Small, but that one row belongs to a real person who said no.

## Changes

| Repo | Change |
|---|---|
| schemas | `reward_claim_track.sql` — re-ranked `FIELD()` lists, exception clause, docblock; `reward_claim_emailed.sql` — `declined` joins the re-armed set and **`dropped` leaves it**; `reward_claim.sql` — status comment; new dated backfill patch; manifest entries in deploy order |
| server-team | `reward.js` — `OPEN` gains `dropped`, `STATUS` gains `declined` |
| ui-team | new `reward-flow/beacon.js`; `_syncUnloadGuard` / `_releaseUnloadGuard` / `_beaconDropped` in `index.js`; "Drop anyway" writes `declined` |
| analytics-ui | `declined` chip, filter option, and colours in **both** skin entries (`app/skin` and `app/user/skin` state the palette twice — keep them in step) |

### `dropped` leaves the re-arm set

Found during implementation; `feat/reward-unload-guard` has this wrong. Its
`reward_claim_emailed` keeps `dropped` alongside `done`/`declined`/`missed` in
the set a fresh send re-arms.

That was right while `dropped` was terminal. It is wrong now: re-arming nulls
`step`, zeroes `clicked_at` and sets the row to `emailed`, which is **not** in
the gate's OPEN set. So a re-send would take a dropped user who was already
eligible and already resuming mid-walkthrough, and demote them to someone who
must go and find the new mail and click it again. **A re-send must never take
access away from someone who already had it.**

The re-arm set is exactly "statuses not in OPEN, minus `emailed`" —
`{failed, declined, missed, done}`.

### "Drop anyway" writes two different statuses

Found by testing on stage, after the first combined build was deployed — it
locked a real tester out of the campaign (row 1213, 2026-08-08 19:07).

Phase 1 gave "Drop anyway" a second job: carry out the reload or Back the user
asked for. Phase 2 gave it a terminal status. Together, an intercepted F5 —
which phase 2 exists to protect — ended as `declined`, permanently out of the
gate's OPEN set.

That inverts the design by information:

| Gesture | What we know | Status | Recoverable |
|---|---|---|---|
| Tab close | nothing | `dropped` | yes |
| F5, intercepted | it is a refresh | `declined` | **no** |

The more we knew the user meant something benign, the harsher the outcome.

So the status follows `_pendingExit`, which is already the exact
discriminator — set only by `onExitIntent`, cleared by "Continue", null when
the user raised the card themselves:

- guard raised by the user (vignette, scrim) → `declined`, terminal;
- guard raised by an intercepted exit → `dropped`, recoverable.

No schema or server change: the proc already accepts `dropped` onto a `started`
row through the named exception, and `STATUS` already allows both.

### `beforeunload` gets one owner

Both source branches register it: `exit-guard.js` as its last-resort net, and
the unload half for its dialog. Combining them naively gives one browser prompt
two owners and puts its arming rules in two places.

It stays with `exit-guard.js`, which owns every signal that ASKS the user
something. The orchestrator's half only reports, on `pagehide`.

The two arming predicates stay separate, though, and that is deliberate:
`_shouldReportUnload` shares the step test with `armed()` but not
`_dropGuardOpen`. That flag exists to stop a second F5 replacing the intent
already on screen; a user who closes the tab while the card is up has still
left, and their exit is still worth recording.

## bfcache is not leaving

`pagehide` with `persisted: true` means the page was frozen and may be restored
intact. Nothing re-posts `started` on restore (`_trackedStep` still holds it), so
reporting a drop there would leave the row saying "gone" for a user about to be
looking at the flow again. Skipped.

## Failure mode

Fail-open, and it equals the status quo. If the request never lands — an engine
that ignores `keepalive`, no network, a UA that kills it — the row stays
`started`, exactly as before this feature existed. Nothing here is load-bearing
enough to justify a throw inside a `pagehide` handler, where an exception can
stall the navigation the user just confirmed.

## Known limitation

Browsers suppress `beforeunload` entirely without prior user interaction (sticky
activation). A user who lands on the desk, is given the flow, and immediately
closes the tab without clicking anything gets no dialog. Unfixable, and
harmless: `pagehide` still fires, so the drop is recorded without a prompt —
the correct funnel fact, and safe now that `dropped` is recoverable.

## Deployment order

1. backfill patch;
2. `reward_claim_track` and `reward_claim_emailed` via `bin/patch-from-file`
   against **every** yellow_page instance — diff the deployed proc first, since
   hand-applied changes have drifted from the repo before;
3. server-team;
4. ui-team;
5. analytics-ui.

Until the proc is patched a `declined` post silently no-ops — `FIELD()` returns
NULL for an unknown value, which coalesces to rank 0 and loses every comparison
— so a half-deployed rollout leaves users at `started` rather than corrupting
the funnel.

---

# Verification

**Phase 1.** No app-level test runner exists in this repo (only the vendored
jitsi specs), so the pure decisions are covered by a bare-Node smoke check of
`classifyKey` and `armed` — including `Cmd+W → null` (not ours), `Ctrl+F5 →
null` (left to the browser), bare `r → null` (the user is typing), and
`soldout → false`.

Manual matrix, run with `?reward=1`. For each of `step1`, `step1_guide`,
`step2_waiting`, `step3_guide`, `soldout`:

1. **F5** → the guard appears, the page does not reload. Continue → still on the
   same step, nothing lost (the create form still holds its input, the invite
   popup still holds its typed emails). F5 again → the guard appears again.
2. **F5 → Drop anyway** → the flow ends *and* the page reloads. The next load
   does not re-open the flow at the same step.
3. **Ctrl+R / Cmd+R / Ctrl+Shift+R** → as F5.
4. **Back** → the guard appears, the desk is still there. Continue → still on
   the step; Back again → the guard appears again (trap re-armed).
5. **Back → Drop anyway** → the flow ends and the browser goes back one page.
6. **Tab close / Cmd+W** → the browser's own dialog. Cancel → still mid-flow.
7. **Moving the cursor out of the viewport** (any edge) → nothing happens.
   Regression check: exit-intent detection was deliberately removed.
8. **`soldout`** → none of 1–7 raises anything, and refresh/close go through
   untouched.

Also check that finishing normally (congrats → "Go to dashboard") leaves the
history clean: one Back press from the desk goes where it did before the flow
ran.

**Phase 2.** Transition matrix against a scratch DB (`utf8mb4_general_ci`,
stubbed `reward_personal_eligible` / `reward_grant_storage`) covering every
`(current, posted)` pair — including every terminal-state case, both directions
of the `started`/`dropped` pair, and `declined` against a later `started`.

Run 2026-08-08: **48 transitions and 12 invariants, 0 failures**, covering the
exception's named pair, the three refusals it must not fire against, a dropped
user returning and completing for exactly one slot, the ineligible-user refusal
consuming no slot, and the cap closing after its last slot.

Two negative controls confirm both changes are load-bearing:

- exception removed → `started + dropped` stays `started`, i.e. `dropped` could
  never be written at all;
- old ladder restored → `dropped + started` stays `dropped`, i.e. a returning
  user reads as "Dropped" forever.

The backfill and the re-arm change are exercised separately against seeded
rows: the patch converts only the `dropped` row and preserves its `step` and
`completed_count`, and after it `reward_claim_emailed` re-arms
`declined`/`done`/`missed` to `emailed` while leaving `dropped` and `started`
untouched.

**Deployed procs on stage were diffed against the repo before any of this: no
drift** in `reward_claim_track`, `reward_claim_emailed` or `reward_claim_failed`.

### Still unverified

Nothing has exercised the browser halves for real — the history sentinel, the
keydown interception, and `fetch(keepalive)` surviving a genuine unload all
need the manual matrix above, in a browser, on a provisioned account. The
`?reward=1` path can drive the flow but reports nothing by design, so the
funnel writes cannot be observed that way.
