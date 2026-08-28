# Contextual sub-tours — build log

One section per phase: what shipped, what the plan got wrong, and what was left.
Replaces ten separate notes/PR files. **Everything here is history** — where it
disagrees with the plan, the plan wins.

For where to start, read `…-index.md`. For the merge gate, `…-runbook.md`.

> **Nothing in any phase has run in a browser.** Every phase is verified by
> automated tests and static analysis only.

---

## Corrections to the plan, all phases

The single most useful thing in the old notes files. Each is something the plan
asserted and the code contradicted.

| # | Phase | Plan said | Reality |
|---|---|---|---|
| 1 | 1 | `desk-module-topbar__new-workspace-btn` is a workspace button, hookable by service name | It is the `Skeletons.Menu` **trigger**, labelled `LOCALE.NEW`, with **no `service`**. Hooked via the menu's `_e.open` instead. |
| 2 | 1 | `drumate.update_settings` can carry the seen-set | It merges **top-level only**, from `this.user` — a session snapshot, not a fresh read. Two tabs lose one write. Forced the dedicated atomic endpoint. |
| 3 | 1 | The seen-set needs its own read request | It already ships in the `get_env` bootstrap payload (`get_user` selects `settings`). No new request; guaranteed before first paint. |
| 4 | 1 | "bind it in the constructor" | `__private_drumate` has no constructor and no binds. Router dispatches by method name. |
| 5 | 1 | `exception.invalid_argument` | Does not exist. Used `bad_request` / `forbiden`. |
| 6 | 1 | `Platform.contextual_tours` | Platform exposes a getter: `Platform.get("contextual_tours")`. |
| 7 | 1 | Generalise the `_startProductTour` kind guard | Unnecessary — every tour mounts under `desk_tutorial`, so the existing check already covers it. |
| 8 | 2 | The sidebar's workspace-open site is `sidebar.js:349` | That line is `new-workspace` (a *creation* affordance). The real sites are `workspace-list/index.js` `case "load-workspace"` / `case "load-folder"`. |
| 9 | 4 | Skip "exits via the same `_enterWorkspace()` path" | That path writes `tutorial_done` and, for `full`, marks all five tours. Skip must do neither. **The substance of Phase 4.** |
| 10 | 4 | C13 adds `SKIP_TOUR` | Already present in all six locales. |
| 11 | 4 | `RADIO_KBD` is the keyboard convention | Dead plumbing — `_handelKbdEvents` is an empty stub and nothing ever triggers it. `libs/hotkeys` is live. |

**Line-number drift** was pervasive in `modules/desk/index.js` (~96 lines by
Phase 3) and caused entirely by this work's own additions. Resolved once in plan
revision 9 by switching modified files to `path` + symbol citations.

**One MariaDB trap**, worth carrying: `JSON_OBJECT` stringifies a `DECLARE`d
routine variable, so `UNIX_TIMESTAMP()` must be inlined or timestamps land as
JSON strings. Verified across `INT`, `INT UNSIGNED`, `BIGINT`.

---

## Phase 1 — desk-owned surfaces (`migrate`, `folder`)

**Shipped:** `drumate_tutorial_seen` proc + `drumate.tutorial_seen` endpoint +
`contextual_tours` flag; `libs/tutorial-tours.js`; the `tours.js` registry;
derived badges; the + New and icons-list triggers. Behind the flag, default off.

**Why an endpoint and not a settings key:** correction 2 above. The proc does the
merge in one `UPDATE` against the current column value, with an `IS NULL`
predicate for first-write-wins.

**Divergence, deliberate:** the ACL ships `"log": false`, not `true` as §4 S9
chose. OQ4's privacy sign-off is outstanding and not creating rows you may have
to delete beats creating rows you may have to justify. `TODO(OQ4)` is at the site.

**Tests found three real defects:** `reconcile()` re-posted ids `markSeen()` had
written the same session; `settings: undefined` hit a destructuring default and
two fail-closed tests were asserting nothing; mock timers installed before
`fresh()` let a real 30s timer leak.

**Verified against a live DB** (scratch schema): idempotent repeat, 40 concurrent
writes across two tour ids both surviving, `''` and invalid-JSON settings healing,
legacy `tutorial_done` preserved.

---

## Phase 2 — cross-tree triggers (`share`, `task`)

**Shipped:** the `tab-task` trigger; both share entries (Manage access and the
kebab), sharing one flag; `share`/`task` badges; folder-window prefetch.

**Zero drift** — all five citations were exact.

**Three things it is careful about:**

- **Both share entry points, one handler.** The topbar icon and the overflow menu
  both raise `folder-manage-access` with `uiHandler: [ui]` — confirmed in source.
  Putting the trigger in the handler is also what kept this clear of **X1**, the
  duplicated visibility gate.
- **`openManageAccess()` toggles.** The flag is read *before* it. Read after, the
  tour would fire on dismissal and never on opening.
- **Single-flight across trees, both halves.** A share click during a running
  `folder` tour mounts nothing **and** does not mark `share` seen.

`Kind.waitFor` is safe to repeat per folder window: it returns the registered
class on its first line once the chunk lands, and webpack memoizes `import()`
before that.

---

## Phase 3 — post-onboarding rewiring

**Shipped:** `fire()`'s return contract; home settles at 2s when a tour is gated;
`markSeen('workspace')` on onboarding-close; derived `workspace` badge.

**The defect it had to fix first.** The overlay branch armed a 20s net assuming a
tutorial would always mount. Routing it through `Tours.fire('workspace')` breaks
that — `fire()` declines for an already-seen tour, on mobile, mid-flight, or with
the switch off — and the net would then be the only route to `_afterHomeSettled`,
delaying the reward flow, LAUNCH30 and the invited-workspace prompt by 18 seconds
**for every mobile signup**.

`fire()` already returned a documented boolean and no call site consumed it, so
the overlay branch becoming its first consumer was additive.

**Why closing the wizard marks the tour seen:** that path writes `onboarded` into
the **local** profile only (the plugin returns before `onboarding.reset`), so the
wizard can legitimately reappear — and without the record the tour would reappear
with it, every time.

**Two guards fired correctly:** `harness-hygiene` caught `Visitor` as both a
harness parameter and a global; the Phase 1 wiring suite's "markSeen is never
called from a trigger site" failed because this phase adds one legitimate call —
**narrowed, not deleted**.

---

## Phase 4 — the skip control

**Shipped:** `✕` on every callout, on every screen; Escape; `end-tour` routed at
the host.

**Skip is not Done** — correction 9. `_enterWorkspace()` writes `tutorial_done`,
which S7 reads as *seen everything* when the map is absent; the map is never
absent today, but **a QA reset clears it**, and then one skip would suppress every
tour forever. And for `full` it marks all five. So `_skipTour()` calls
`softDestroy()` and nothing else — the tour is already recorded from mount.
**Skipping `full` records nothing, so the contextual tours stay armed.**

**Routing: no step file changed.** The spotlight is the one object holding both
references, so it passes `tutorial_main` as the callout's `host`; the `✕` raises
there while Back and Next stay on the step.

**Escape: capture phase.** The desk's existing Escape guards on
`!e.defaultPrevented`, so the two interlock through that contract instead of
racing. Bind in `onDomRefresh`, unbind in `onBeforeDestroy` — a capture-phase
global Escape must not outlive the thing it belongs to. `window/confirm` answers
Escape on **keyup**, a split `libs/hotkeys.js:45-46` already documents as accepted.

---

## Phase 5a — cleanup

**Shipped:** `tutorial_settings` deleted; `meeting`'s badge derived. **Every step
badge is now derived**, which makes `?tutorial=1` (runbook B5) the single check
standing behind six edits across four phases.

Swept by **string**, not by import — an unreachable kind fails at runtime, not at
build. Its fifteen `LOCALE` keys are all used elsewhere; none orphaned.

**The Phase 3 guard was inverted, not deleted**, as intended when written: it now
asserts that *no* step file hardcodes a badge, and is worth keeping permanently.

**`SKIP_TOUR` audit:** all six locales say "skip the tour"; `grep` finds exactly
one consumer, so the key was authored for a skip control that was specified and
never built. Fine as a tooltip.

---

## Statements in the plan that have become untrue

For a decision, not fixed in place. None affects the code.

| # | Section | Says | Now |
|---|---|---|---|
| 1 | §1 | `_widgets` is a literal table; `_preloadSteps` warms 5 kinds | Built by `_buildWidgets`; warms only the active tour |
| 2 | §1 | 15 hardcoded `badge_text` sites across 7 files | Zero |
| 3 | §1 | `tutorial_settings` still registered in `seeds.js` | Deleted in 5a |
| 4 | §5, §6 | Written as future work | All done through 5a |
| 5 | §3 | Describes the overlay branch directly | Correct but redundant since `_launchHomeTutorial` |

**Recommendation:** 1–3 are §1 correctly recording the *pre-work* baseline; the
cleanest fix is one sentence saying so, not a rewrite that loses it. 4 and 5 are
tidying. Nothing downstream depends on any of them.

---

## Deferred, across all phases

- **5b (rollout)** — procedure only, `…-rollout.md`. Blocked on the runbook
  sign-off, OQ4 and OQ7.
- **OQ6** — five hypotheses ruled out; runbook 1.6b answers it in situ.
- **X1** (duplicated share gate), **X2** (duplicated repartition preamble),
  **X3** (callout copy localisation, ~240 entries) — untouched, unscheduled.
- ~~`phase3` / `phase4` carry a stale runbook copy~~ — **resolved.** The four
  ui-team phase branches were consolidated into one `feat/contextual-sub-tours`,
  which carries the complete runbook (every block plus every correction). There
  is no stale copy left to build from.
