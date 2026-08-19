# Contextual sub-tours — merge index

> **Nothing in this work has ever run in a browser.** Every phase is verified by
> automated tests and static analysis only; the manual gate — `…-runbook.md`,
> Blocks A–E — has not been worked by anyone. Nothing merges until it has.

One page to open cold. Start at **§2 Merge order**.

---

## 1. Branches

Five branches. **`phase1` carries commits in three repos**; every later branch is
`ui-team` only and stacks on its predecessor.

| Branch | Repos | What is on it | Depends on | Gated by |
|---|---|---|---|---|
| `feat/contextual-sub-tours-phase1` | **ui-team** (9), **schemas** (1), **server-team** (1) | Phases 1 **and** 2: the proc + endpoint + kill switch, `libs/tutorial-tours`, the tour registry, derived badges, and all five triggers (+ New, icons list, sidebar ×2, Manage access ×2, kebab Share, Tasks tab). Plus the runbook. | — | Runbook **A–C** |
| `feat/contextual-sub-tours-phase3` | ui-team (12) | Post-onboarding rewiring: `fire()`'s return contract, home settles at 2s when a tour is gated, `markSeen` on onboarding-close, derived `workspace` badge. | phase1 | Runbook **D** |
| `feat/contextual-sub-tours-phase4` | ui-team (15) | The skip control: `✕` on every callout, Escape, `end-tour` routed at the host. | phase3 | Runbook **E** |
| `feat/contextual-sub-tours-phase5a` | ui-team (19) | Cleanup: delete the retired `tutorial_settings`, derive the last badge (`meeting`). | phase4 | Runbook **B5** |
| *(5b — rollout)* | none | **No code.** Procedure only, in `…-rollout.md`. | all of the above | OQ4, OQ7 |

Commit counts are cumulative from `test`. `phase5a` contains everything.

---

## 2. Merge order

Each step is independently shippable, and every one of them is dark:
`contextual_tours` is absent from `myDrumee.json`, so no trigger fires and
nothing is written.

| # | Merge | Unblocked by | Notes |
|---|---|---|---|
| 1 | **schemas** + **server-team** `phase1` | nothing | Additive: a new proc and a new endpoint. Safe to merge and deploy ahead of the client — an old client ignores the `tutorials_seen` key. **Apply the proc** (`bin/patch-from-file`) or the client's writes 500 the moment the flag is ever turned on. |
| 2 | **ui-team** `phase1` (Phases 1+2) | Runbook **Blocks A, B, C** signed off | The bulk of the feature. |
| 3 | **ui-team** `phase3` | Block **D** | Touches the path every new signup takes — merge separately from 2 so a regression there is bisectable. |
| 4 | **ui-team** `phase4` | Block **E** | |
| 5 | **ui-team** `phase5a` | Block **B5** re-checked (all six badges derived) | Rides on 4; no user-visible change. |
| 6 | **5b — enable** | OQ4 (both halves) **and** OQ7, plus a completed runbook sign-off | Not a merge. Follow `…-rollout.md`. |

Steps 2–5 can also be merged as one if the whole runbook is signed in a single
pass; the split exists so a failing block does not hold up the blocks that passed.

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
