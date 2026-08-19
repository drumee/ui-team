# PR — Contextual sub-tours, Phase 5a (cleanup)

Branch **`feat/contextual-sub-tours-phase5a`**, off Phase 4. Spec: revision 7, §6 Phase 5a.

**Phase 5 was split.** 5a is this: dark, reversible, no user impact. **5b — the
rollout — is a written procedure with no code**, because it is the first moment
the feature reaches a real user and it is blocked on two sign-offs that do not
exist yet.

> Runbook Blocks A–E have never been worked. Nothing in Phases 1–5a has run in a
> browser.

## What ships

`ed21c073` — delete the retired `tutorial_settings`; derive `meeting`'s badge.

**Every step badge is now derived.** `?tutorial=1` (runbook **B5**) is
consequently the single check standing behind six edits made across four phases,
and the runbook now says so.

## Deleting the retired step

Swept by **string**, not by import: an unreachable kind fails at runtime, not at
build, so a grep for the symbol is the only sweep that means anything. Hits were
`seeds.js:143` and its own three files — nothing else. Its fifteen `LOCALE` keys
are all generic and used elsewhere, checked one by one, so none is orphaned. It
also carried the stale `STEP 3/5` that never matched the six-step tour.

## The guard was inverted, not deleted

Phase 3 added a test pinning `meeting` as the last hardcoded badge, specifically
so this phase could not finish C5 without tripping it. It now asserts that **no**
step file hardcodes a badge — worth keeping permanently, since a new step widget
that hardcodes one would otherwise disagree silently with its registry entry.

## Follow-ups from the Phase 4 review

**A-1 — OQ6 narrowed, not closed.** Both suggested checks came back negative, and
two more with them: the class and the `sys_pn` are the same node
(`Skeletons.Wrapper.Y` merges them; its `wrapper: 1` is inert); nothing portals;
the `dialog__wrapper` class the Wrapper adds has no rule touching opacity; and
the **fully compiled** desk stylesheet keeps `opacity: 0` unless
`[data-state=open]`, whose only writer is the mobile drawer.

The reasoning in the review was right — opacity is not recoverable by a
descendant, so the static reading must be wrong about *where the tutorial lands*.
Four checks later I still cannot find where, which makes the finding **stronger
than "undetermined"**: static evidence now says a desktop tutorial fed into
`overlay` would be invisible, and it plainly is not. Runbook item **1.6** — the
first thing a tester does — is a direct test of this. No §7 note was added,
because that note was conditional on an answer I do not have.

**A-2 — Escape is correctly scoped.** Bind in `onDomRefresh`, unbind in
`onBeforeDestroy`; a test pins both plus "registered exactly once". Survey: the
hotkeys lib never calls `stopPropagation`, `desk-escape` checks
`defaultPrevented` and declines, and `window/confirm` answers on **keyup** — a
split `libs/hotkeys.js:45-46` already documents as known and accepted. Nothing is
newly shadowed.

**A-3 — `SKIP_TOUR` is ours and reads correctly.** All six locales say "skip the
tour"; none is a repurposed label. `grep` finds exactly one consumer — the Phase
4 control — so the key was authored for a skip control that was specified and
never built. Fine as a tooltip, which is the only way it is used. No new key.

## Tests

Three new (28 in that file, all green). Suite **278 pass / 2 fail** — the same
pre-existing unicode pair.

- the inverted no-hardcoded-badge guard
- a string sweep proving `tutorial_settings` is gone (it had to learn to skip
  itself — it matched its own regex literal)
- Escape's binding tied to the tutorial's lifecycle

## Also here

**`…-rollout.md`** — the 5b procedure. Two things in it are worth knowing before
anyone plans a launch:

- **The flag is boolean per deployment.** No percentage, no cohort. Staging comes
  from *which* deployment you enable, not what fraction of its users you reach. A
  1%-then-10% plan would need a mechanism that does not exist.
- **`full` must stay reachable after the flag branch is deleted.** §2 D7 makes it
  permanent because `tutorial_meeting` has no other route, so `?tutorial=1` and
  Get help → Product Tour both have to keep working — stated explicitly rather
  than left for the next person to rediscover.

It also covers the preconditions, per-stage watch signals, and the rollback,
which is a config change rather than a deploy.
