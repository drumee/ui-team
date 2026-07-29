# Reward slot cap — first 100 users only

**Date:** 2026-07-29
**Repos:** `schemas`, `server-team`, `ui-team`, `analytics-server`, `analytics-ui`

## Problem

The claim-reward campaign mail promises "Limited 100 spots ONLY", but nothing
enforced it. Every invited user who followed the CTA got the full walkthrough
and the reward, however many had already finished. The campaign had a headline
number and no mechanism behind it.

## What this adds

The flow is **active for the first 100 users who complete it** and **closes for
everyone after**. A user who arrives once the slots are gone is told so on a
screen of its own rather than shown nothing.

## Decisions

| Question | Decision |
|---|---|
| What consumes a slot | Completing the flow — one user, one slot, forever |
| How it is counted | `reward_claim.completed_count > 0`, derived, never a stored counter |
| Race at the boundary | **Hard 100.** The completion itself is refused past the cap |
| Who sees the notice | Both the refused finisher and the invited user who arrives late |
| Show-once | A new terminal `status = 'missed'`, written when the notice is dismissed |
| Limit | `reward_conf.slots` sysconf, default **100** in every service |
| Dashboard | Slot counter, `missed` filter, and sends blocked once full |

### Why `completed_count`, not `status = 'done'`

`reward_claim_emailed` re-arms a finished user back to `'emailed'` when the
campaign is re-sent. Counting `'done'` rows would silently hand that user's slot
back and let the total rewarded drift past 100. `completed_count` survives the
re-arm, so the count only ever grows, and a user finishing a re-armed attempt
does not take a second slot.

### Why hard-100 rather than "let them finish"

Letting in-flight users finish is simpler and never yanks anyone mid-walkthrough,
but the total rewarded then exceeds 100 by however many were concurrent. The cap
is a public promise, so the count is the thing that must hold.

The cost is a user who does all three steps and is refused at the end. That case
is made rare by layering: **the gate turns capped users away before Step 1**, so
only someone already mid-session when the last slot goes can hit the refusal.

## Architecture

```
analytics-ui                    ui-team desk + reward-flow widget
  slot counter ─┐                 gate ─┐        completion ─┐
  missed filter │                       │                    │
  send blocked  │                       │                    │
                ▼                       ▼                    ▼
analytics-server              server-team reward.get_state   reward.track
  reward_slots()                {eligible, capped, step}     {granted}
                └──────────┬────────────┴────────────────────┘
                           ▼
                  yp.reward_slots_used()      yp.reward_claim_track(…, _limit)
                  COUNT(completed_count > 0)   GET_LOCK → count → award | 'missed'
                           └────────── yp.reward_claim ──────────┘
```

### schemas

- **`yellow_page/functions/reward_slots_used.sql`** (new) — `RETURNS INTEGER
  READS SQL DATA`, `COUNT(*) WHERE completed_count > 0`. A *function*, not a
  procedure: both callers want one number, `await_func` unwraps a scalar, and a
  `CALL`'s own SELECT comes back as a raw multi-resultset that does not parse
  into a row.
- **`reward_claim_track.sql`** — **signature unchanged**. On a `'done'` request
  from a row that does not already hold a slot: `GET_LOCK('reward_slot', 5)` →
  count → award, or write `'missed'` when at the limit. Failing to *take* the
  lock refuses the award — under contention the only answers are "wait" and
  "no", and granting on timeout is the over-award the lock exists to prevent.
  The limit is read from `sys_conf.reward_conf -> $.slots` **inside the proc**.
  It was briefly a parameter, which coupled the schema to a server deploy —
  every runtime still on the previous build failed with "Incorrect number of
  arguments" the moment the proc required it. Caught on stage, where three
  runtimes call it. The value is regexp-tested before casting: `CAST('abc' AS
  SIGNED)` raises under strict mode and would abort a completion the user had
  earned, so a malformed or zero setting falls back to 100.
- **`reward_claim_emailed.sql`** — `'missed'` joins `'done'`/`'dropped'` in the
  re-arm set, so raising the limit and re-sending re-opens the flow for the
  people who were turned away.
- **Status ladder** — `emailed(1) < clicked(2) < started(3) < dropped(4) <
  missed(5) < done(6)`. `'missed'` outranks `'started'`/`'dropped'` so it sticks;
  `'done'` outranks it so no late post can take a slot off a user who holds one.
- No table change. A comment-only patch documents the new status.

### server-team (`service/private/reward.js`)

- `get_state` returns **`capped`**: eligible, but every slot is gone. `step` is
  blanked — a capped run has nothing to resume into. **Capped outranks resume**,
  which is what keeps the refusal path rare.
- `track` returns **`granted`**, read back with `await_query` (the proc's
  trailing SELECT does not parse into a row). It does *not* pass a limit — the
  proc owns that, so schema and server deploy independently. `_slotLimit()`
  survives only for the gate's capped check, where a disagreement can at worst
  offer a flow the completion then refuses, which the sold-out screen handles.
- A DB failure in the slot count answers *full*: everywhere else in this service
  the safe default is already "no reward".

### ui-team

- **`soldout`** — a terminal step beside `congrats`, rendering the same
  vignette-only root and the same card shell, with a neutral info chip
  (`ctxmenu-info`, the only info glyph in the sprite drawn with
  `fill="currentColor"`).
- Reached two ways: `opt.capped` at mount (no walkthrough at all, and no
  `'started'` post — a user who was never offered the flow must not appear
  mid-funnel), or a refused completion.
- `_track` now returns its promise. `'done'` is the one awaited call, because it
  is a *request* for a slot, not a report.
- **No answer means granted.** The gate already turned capped users away, so a
  user who reached Step 3 was inside the cap when they started; refusing on
  silence would take the reward off someone for our outage. A failed post leaves
  the row at `'started'`, so a later visit finds them capped at the gate instead.
- Dismissal posts `'missed'` — on dismissal rather than on display, so a user who
  never actually saw the notice is still eligible to be told next time.

### analytics-server / analytics-ui

- `reward_slots()` → `{ claimed, limit, remaining, full }`, its own service
  because `output.list()` has no room to carry a scalar alongside a paged list.
- `claim_reward()` **refuses to send** when full: mailing an invitation the desk
  will answer with a sold-out notice is worse than not mailing at all.
- Dashboard shows `84 / 100 slots claimed` beside the send controls, coral once
  full; `Missed (no slot)` joins the status filter and the row pills, styled
  neutral rather than coral — "Dropped" is the user walking away, "Missed" is us
  closing the door.

## Verification

Applied to a scratch DB and exercised:

- 4 completions against a limit of 3 → 3 `done`, 1 `missed`, `reward_slots_used`
  = 3.
- **20 simultaneous completions against a limit of 5 → exactly 5 `done`, 15
  `missed`.** The lock holds under real concurrency.
- Ladder: `missed` sticks over a later `started`; `dropped` → `missed` advances;
  a `done` row posting `missed` stays `done`.
- Re-arm: a finished user re-armed and completing again → `completed_count = 2`,
  slots still 3. A `missed` user re-armed → back to `emailed`, and wins a slot
  once the limit is raised.

Config handling: a missing key, a non-JSON `conf_value`, a missing `$.slots`, a
non-numeric one, `0` and a negative all fall back to 100. A real `{"slots": 2}`
caps at 2.

Applied to the local `yp` (where the reward procs were absent entirely) and to
stage via `ssh huan@drumee.in`, after checking the deployed procs for drift —
there was none — and backing them up to `~/schema-backups/`. Smoke-tested on
stage through the 4-argument call the deployed runtimes actually make, then the
test row was deleted; the one real funnel row was untouched.

Both stylesheets compile; the sold-out card was rendered headless beside congrats
to confirm identical geometry.

## Deliberately not done

- No waitlist or notify-me on the sold-out screen — nothing to offer, so nothing
  promised.
- No slot-reservation at `'started'`: abandoned runs that never post `'dropped'`
  would hold slots forever.
- No `slot_no` column: the award order is not needed by anything.
