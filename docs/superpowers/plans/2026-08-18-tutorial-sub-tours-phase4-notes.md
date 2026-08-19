# Phase 4 — implementation notes

Companion to `2026-08-18-tutorial-sub-tours.md` (revision 6).
Branch **`feat/contextual-sub-tours-phase4`**, off the Phase 3 head.
Manual items are **Block E of the runbook**.

---

## Drift

| Plan says | Reality | Verdict |
|---|---|---|
| §2 D4: skip "exits via the same `_enterWorkspace()` path" | **Wrong, and the substance of the phase.** That path writes `tutorial_done` and, for `full`, marks all five flagged tours. Corrected in revision 6. | ⚠ |
| §5 C13: add `SKIP_TOUR` | **Already present in all six locales** (`en.json:1540` and siblings). No work. | ⚠ |
| `tooltipBadge` `hide_back` handling at `tooltip.js:74-84` | exact | ✅ |
| spotlight feeds the callout via `tooltipBadge(owner \|\| this, …)` | exact | ✅ |
| §1: "no close affordance on the callout" | exact — four card children, no `×`, no Esc | ✅ |
| `RADIO_KBD` as the keyboard convention | **Dead plumbing.** `_handelKbdEvents(e) { }` is an empty stub (`wm/index.js:1174`) and nothing in the app or ui-core ever calls `RADIO_KBD.trigger`. The live convention is `libs/hotkeys` (`modules/desk/index.js:82-101`). | ⚠ |

---

## The two decisions

**Skip is a distinct exit.** `_skipTour()` calls `softDestroy()` and nothing
else. The `tutorial_done` write is not merely inappropriate, it is load-bearing:
S7 reads `tutorial_done` truthy + `tutorials_seen` absent as *seen everything*,
and although the map is never absent once a tour has mounted, a QA reset clears
it — after which one skip would suppress every tour forever. And for `full`,
Done marks all five; skipping on screen 1 would record the user as having seen
tours they just declined. Skipping `full` now records nothing, which is right:
`full` is unflagged and the contextual tours stay armed.

**`end-tour` is routed at the host.** Back and Next belong to the step widget —
only the step knows whether it has another screen. Ending the tour belongs to
the tour. The spotlight is the one object holding both references, so it passes
`tutorial_main` into `tooltipBadge` as `host`, and the control raises there. One
case in `tutorial_main`; **no step file changed**, and a test asserts none of the
six mentions `end-tour`.

**Escape: implemented, capture phase.** The desk's existing bubble-phase Escape
guards on `!e.defaultPrevented`, so a capture binding that reports it acted gets
`preventDefault()` from `libs/hotkeys` and the desk then declines that keypress
itself. The two interlock through the existing contract. A test pins the desk's
guard, because the interlock silently breaks if that condition is ever dropped.

---

## Verified

**15 new assertions, all green.** Suite **276 pass / 2 fail** — the same two
pre-existing `entry-compliance-unicode.test.js` failures.

The two that matter run the **real `_skipTour` and `_enterWorkspace` bodies**,
lifted from source, side by side: skip writes nothing on a contextual tour and
nothing on `full`; Done still writes `tutorial_done` and still marks all five.
Pointing `end-tour` back at the Done path fails three of them.

The control itself is built through a recording `Skeletons` stub, so its presence
on the first screen (where `hide_back` is set) and on the last (where `done` is
set) is asserted for real rather than by reading the source.

One harness bug caught in passing: the first stub implemented `setItem`, but the
production code writes `localStorage.onboarding_step = "0"` as a **property**, so
the Done assertion was testing nothing.

**Not verified:** nothing has run in a browser. Block E covers it.

---

## Deferred

- **A-1 / OQ6** — whether a click reaches the real desk during a tour is still
  unresolved; runbook A11a answers it in situ. No §7 note was added, because
  asserting "structurally unreachable" without the answer would be a guess.
- **C11, C12, C5 for `meeting`, the kill-switch default flip (Phase 5)** — and
  Phase 5 in particular must wait for a signed-off runbook, since it is the first
  moment any of this reaches a real user.
- **X1 / X2 / X3** — untouched.
