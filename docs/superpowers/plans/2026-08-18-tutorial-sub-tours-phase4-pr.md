# PR — Contextual sub-tours, Phase 4 (skip control)

Branch **`feat/contextual-sub-tours-phase4`**, off Phase 3. Spec: revision 6, §6 Phase 4.
Still dark by default.

> Nothing in Phases 1–4 has run in a browser. Runbook Blocks A–C gate Phases 1–2,
> D gates Phase 3, **E gates this one**. None has been worked.

## What ships

An **✕** on every callout, on every screen of every tour, plus **Escape**. Both
leave the tour without finishing it.

`542497b8` — the control, the routing, Escape, styles, tests.

## Skip is not Done, and that is the whole phase

D4 said skip "exits via the same `_enterWorkspace()` path". Reading that path
first says otherwise, and the reason is not cosmetic:

| `_enterWorkspace()` does | Why skip must not |
|---|---|
| writes `tutorial_done: true` | S7 reads `tutorial_done` truthy **and** `tutorials_seen` absent as *has seen everything*. The map is never absent once a tour has mounted, so it does not fire today — but a **QA reset clears the map**, and then one skip permanently suppresses every tour. |
| for `full`, marks all five flagged tours | Skipping `full` on screen 1 would record the user as having seen every tour they just declined to watch. |

So `_skipTour()` calls `softDestroy()` and **nothing else**. It does not need to
write: the tour was recorded when it *mounted* (Phase 1), which is what stops it
re-triggering. Skipping `full` records nothing, so the contextual tours stay
armed — correct, since the user has not seen them.

Everything chained on `destroy` — reward flow, LAUNCH30, invited-workspace
prompt, Get-help return, single-flight release — is untouched, because
`softDestroy()` is what Done uses too.

## Routing: one rule, no step files changed

Back and Next are wired at the **step** widget, because only the step knows
whether it has another screen. Ending the tour belongs to the **tour**. The
spotlight is the one object holding both references — `owner` is the step, its
own `partHandler` is `tutorial_main` — so it passes the host into `tooltipBadge`
and the control raises there. One case in `tutorial_main`, and a test asserts
none of the six step files mentions `end-tour`.

## Escape: implemented

At **capture** phase. The desk already owns a bubble-phase Escape whose `match`
guards on `!e.defaultPrevented`, so a capture binding that reports it acted gets
`preventDefault()` from `libs/hotkeys` and the desk then declines that keypress
on its own terms — the two interlock through the existing contract rather than
racing. A test pins the desk's guard, since dropping it would break the interlock
silently.

Rejected: leaving Escape out because an accidental press is permanent. It is no
more permanent than an accidental reload — the tour is recorded from mount
either way.

## Tests

**15 new, all green.** Suite 276 pass / 2 fail (the pre-existing unicode pair).

The two that matter run the **real `_skipTour` and `_enterWorkspace` bodies side
by side**, so re-pointing `end-tour` at the Done path fails loudly in three
places. The control's presence on the first screen (`hide_back` set) and the last
(`done` set) is asserted through a recording `Skeletons` stub, not by reading
source.

## Also here

- **Plan revision 6** — D4 corrected, routing and Escape recorded, a §7 risk row.
- **Runbook Block E** — six manual items. **E4** is the one that matters: skip
  `full`, then confirm from the **database** that the contextual tours are still
  armed.
- **Runbook corrections** (on the Phase 1/2 branch, `bd3c1d41`): the timestamp
  shape check, an unambiguous stale-bundle gate, and A11 rewritten to determine
  in situ whether the overlay passes clicks through.

## Two things a reviewer should know

**C13 needed no work** — `SKIP_TOUR` already existed in all six locales.

**OQ6 is open.** Whether a click reaches the real desk while a tour is up could
not be settled from source: the spotlight's layers are all `pointer-events: none`,
but the layer they sit in computes `opacity: 0` — which would make the tour
invisible, so the running app differs from the static reading somewhere I could
not find. It is recorded in §9 with the evidence, and runbook A11a answers it in
ten seconds. It does not block this phase: the callout's children are
`pointer-events: auto` either way, which is why Next and Back already work.
