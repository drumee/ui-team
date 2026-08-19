# Phase 5a — implementation notes

Companion to `2026-08-18-tutorial-sub-tours.md` (revision 7).
Branch **`feat/contextual-sub-tours-phase5a`**, off Phase 4.
Manual coverage: runbook **B5** (`?tutorial=1`), which this phase makes
load-bearing. **5b is procedure only — see `…-rollout.md`.**

---

## Drift

| Plan says | Reality | Verdict |
|---|---|---|
| `seeds.js:143` registers `tutorial_settings` | exact | ✅ |
| `tutorial_settings` is unreachable | exact — nothing outside its own three files referenced it | ✅ |
| `meeting` is the last hardcoded badge | exact | ✅ |
| §5 C13 `SKIP_TOUR` (Phase 4 carry-over) | already existed in all six locales | ⚠ (recorded r6) |
| §2 D4 skip = `_enterWorkspace()` (Phase 4 carry-over) | wrong; corrected r6 | ⚠ (recorded r6) |

---

## Follow-ups A-1, A-2, A-3

### A-1 — OQ6 narrowed, not closed

Both suggested checks came back **negative**, and two more with them:

1. **Same node?** Yes. `Skeletons.Wrapper.Y` merges `className` and keeps the
   caller's `sys_pn`, so `.desk-module__overlay` and `sys_pn: "overlay"` are one
   element. Its `wrapper: 1` is inert — nothing in ui-core reads it.
2. **Portal?** No. The only `closest()` in the tutorial module is
   `migrate/index.js:90`, scoping a `querySelector`. Nothing re-parents.
3. **`.dialog__wrapper` override?** The Wrapper does add that class — a fact I
   had missed — but no base rule for it touches `opacity` or `pointer-events`.
4. **Anything later in the cascade?** No. Compiled the **whole** desk stylesheet:
   `opacity: 0` stands unless `[data-state=open]`, whose only writer is
   `_setMobileBackdrop` (mobile drawer). `setState()` writes `data-state="1"`,
   which does not match that rule.

The reasoning in the prompt was right — opacity is not recoverable by a
descendant, so the static reading must be wrong about *where the tutorial lands*.
Four checks later I still cannot find where. The finding is now **stronger than
"undetermined"**: static evidence says a desktop tutorial fed into `overlay`
would be invisible, and it is not, so a premise about the running app is wrong in
a way static analysis has not reached.

Usefully, this makes runbook item **1.6** — the very first thing a tester does —
a direct test of it. If the tour appears there, the static reading is disproved
and A11a settles the remaining pointer-events half. OQ6 stays open with all four
dead ends recorded, and **no §7 note was added**, because the note was
conditional on an answer I do not have.

### A-2 — Escape is correctly scoped, and shadows nothing new

Bind is in `onDomRefresh`, unbind in `onBeforeDestroy` — the tour's own mount and
destroy, never module load and never the desk. A test now pins both halves plus
"registered exactly once".

Survey of every other Escape handler: `libs/hotkeys` never calls
`stopPropagation` (its own rule 4), so nothing is prevented from *running*.
`desk-escape` checks `defaultPrevented` and declines correctly.
`window/confirm/index.js:104` answers on **keyup** — a different event — which
`libs/hotkeys.js:45-46` already documents as a known and accepted split, so it is
not newly shadowed. The rest are element-level handlers on inputs inside windows
that cannot be focused while the tour's mock desk is up.

### A-3 — `SKIP_TOUR` copy is fine, and it is ours

| | |
|---|---|
| en | Skip tour |
| es | Saltar el recorrido |
| fr | Passer la visite |
| km | រំលងការណែនាំ |
| ru | Пропустить тур |
| zh | 跳过教程 |

All six say "skip the tour" — none is a repurposed label from another flow, and
all read correctly as a **tooltip**, which is the only way this phase uses it
(the control is a `cross` glyph, not a text button). No new key needed.

Provenance: `grep` finds exactly **one** consumer in the codebase — the control
added in Phase 4. So the key was authored for a skip control that was specified
and never built, most likely alongside the original tour. Nothing else reads it,
so there was no risk of collision either.

---

## Phase 5a itself

**Deleting `tutorial_settings`.** Swept by **string**, not by import — an
unreachable kind fails at runtime, not at build. `seeds.js:143` plus its own
three files were the only hits. Its fifteen `LOCALE` keys are all generic and
used elsewhere (checked individually), so nothing is orphaned. It also carried
the stale `STEP 3/5` that never matched the six-step tour.

**`meeting`'s badge.** Single-screen, so both badge modes agree: `STEP 3/6` as
step three of `full`, its only route.

**The guard is inverted, not deleted** — as intended when Phase 3 wrote it. It
now asserts that *no* step file hardcodes a badge, which is worth keeping
permanently: a new step widget that hardcodes one would otherwise disagree
silently with its tour's registry entry.

Two new tests beyond that: the string sweep (which had to learn to skip itself —
it matched its own regex literal) and the Escape-lifecycle assertions from A-2.

**28 assertions in that file, all green.** Suite **278 pass / 2 fail** — the same
pre-existing `entry-compliance-unicode.test.js` pair.

---

## Deferred

- **5b** — procedure written, no code. Blocked on the runbook sign-off and OQ4.
- **OQ6** — open, four hypotheses ruled out.
- **X1 / X2 / X3** — untouched.
