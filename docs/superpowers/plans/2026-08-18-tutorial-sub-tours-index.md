# Contextual sub-tours — merge index

> **Nothing in this work has ever run in a browser.** Every phase is verified by
> automated tests and static analysis only; the manual gate — `…-runbook.md`,
> Blocks A–E — has not been worked by anyone. Nothing merges until it has.

One page to open cold. Start at **§2 Merge order**.

---

## 1. Branches

**One branch per repo, same name in all three: `feat/contextual-sub-tours`.**
It contains every phase — there are no per-phase branches any more.

| Repo | Commits | What is on it |
|---|---|---|
| **schemas** | 1 | `drumate_tutorial_seen.sql` + the manifest entry |
| **server-team** | 1 | `drumate.tutorial_seen` ACL entry + service method, `contextual_tours` platform flag |
| **ui-team** | 20 | Everything client-side: `libs/tutorial-tours.js`, the `tours.js` registry, all five triggers, derived badges, the skip control, the cleanup — plus 6 test files and these 5 documents |

Phases 1–5a were built on four stacked ui-team branches
(`…-phase1/3/4/5a`) and consolidated once the work was complete. The phase
boundaries survive as commits, not branches; `…-phases.md` is the per-phase
record. Nothing was lost in the consolidation — the two runbook commits that
existed only on `phase1` had already been cherry-picked forward, and their
content was verified line by line against the surviving copy.

> Pre-consolidation tips, if anyone ever needs them: `phase1 ad3cf050`,
> `phase3 72545c35`, `phase4 98f63d5c`, `phase5a 2fba0fd4`.

---

## 2. Merge order

Everything is dark: `contextual_tours` is absent from `myDrumee.json`, so no
trigger fires and nothing is written.

| # | Merge | Unblocked by | Notes |
|---|---|---|---|
| 1 | **schemas** | nothing | Additive. **Apply the proc** (`bin/patch-from-file …drumate_tutorial_seen.sql yellow_page`) or the client's writes 500 the moment the flag is ever turned on. *Already applied to **stage** manually.* |
| 2 | **server-team** | nothing | Additive; an old client ignores the `tutorials_seen` key. Safe to deploy ahead of the client — and it must be, or the client's calls 404. |
| 3 | **ui-team** | Runbook **Blocks A–E** signed off | One branch, all phases. Blocks A–C cover Phases 1–2, D covers Phase 3, E covers Phase 4, and B5 re-checked covers 5a. |
| 4 | **enable** | OQ4 (both halves) **and** OQ7, plus the completed runbook sign-off | Not a merge. Follow `…-rollout.md`. |

The ui-team branch is one merge now rather than four. If a runbook block fails,
the fix is a commit on the same branch — there is no partial-merge path any more,
which is the one thing the old four-branch split bought.

---

## 3. Open items

| Item | Question | Blocked on | Blocks |
|---|---|---|---|
| **OQ4a** | Is `contextual_tours` the right key, and is the staged plan agreed? | whoever owns `/etc/drumee/conf.d/myDrumee.json` | enabling anywhere (step 6) |
| **OQ4b** | `"log": true` on `drumate.tutorial_seen` — five timestamped behavioural rows per user in `services_log`. Ships `false` with a `TODO(OQ4)`. | privacy review | nothing today; only trigger-rate analytics wait |
| **OQ6** | Does a click reach the real desk while a tour is up? Decides whether the cross-tree collision single-flight guards can occur at all. | **five static hypotheses ruled out**; needs the app | nothing — runbook **1.6** tests it for free, **A11a** settles the rest |
| **OQ7** | Who gets interrupted when the flag flips — every existing active user once, or new accounts only? | **product** | step 6, and the backfill if the answer is "new accounts only" |
| **The runbook** | 18 items + Blocks D and E, never worked | a person with a deployed build | every merge |

OQ7 is the one most likely to be missed: it reads like a rollout detail and is
actually a product decision with engineering work behind one of its answers.

---

## 4. Documents

Five documents. The first three are durable; the fourth is operational; the fifth is history.

| Document | What it is | Read it when |
|---|---|---|
| `…-tutorial-sub-tours.md` | The plan. Eight revisions; §2 decisions, §4 server contract, §9 open questions. | You need to know *why* something is the way it is. |
| `…-runbook.md` | The manual verification gate. Setup, state SQL, 18 items in an order that does not burn state, triage table, sign-off block. | Before any merge. It is the gate. |
| `…-rollout.md` | Phase 5b. Preconditions, staging, watch signals, rollback, the §2b interruption decision and its backfill, and the flag-removal work. | Before enabling anything for a real user. |

| `…-phases.md` | The build log: one section per phase — what shipped, what the plan got wrong, what was deferred. Opens with **every correction to the plan**, all phases in one table. | Writing a PR description for §2, or wondering why something was built the way it was. |

`…-phases.md` is history; where it disagrees with the plan, the plan wins. It
replaces ten earlier per-phase notes/PR files, whose content is folded into it.

---

## 5. If you only do one thing

Work **runbook §1 setup and item 1.6**. It takes ten minutes, it is the gate for
everything in §2, and it independently answers OQ6.
