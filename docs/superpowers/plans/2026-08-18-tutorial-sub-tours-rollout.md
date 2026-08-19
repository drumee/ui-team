# Phase 5b — rollout procedure

**No code exists for this phase and none should be written yet.** This is the
document that says what turning the feature on requires, in what order, and what
would tell you to turn it back off.

Everything through Phase 5a is **dark**: `contextual_tours` is absent from
`myDrumee.json`, so no trigger fires and nothing is written. 5b is the first
moment any of this reaches a real user.

---

## 1. Preconditions — all three, none waivable

| # | Gate | Evidence needed |
|---|---|---|
| P1 | **Runbook signed off** — Blocks A, B, C, D, E | A completed sign-off block in `…-runbook.md` with a **name**, a **date**, and the **build SHA**. Blocks A–C gate Phases 1–2, D gates 3, E gates 4. All five are in the build by 5b, so all five must be worked. Nothing has been worked yet. |
| P2 | **OQ4 — the ops key** | Whoever owns `/etc/drumee/conf.d/myDrumee.json` confirms `contextual_tours` as the key name and agrees the staged plan below. |
| P3 | **OQ4 — the privacy decision** | The ACL entry ships `"log": false` with a `TODO(OQ4)`. Either privacy review signs off on `true` (five timestamped behavioural rows per user in `yp.services_log`, exported by `offline/drumate/backup.js:248`) **or** the TODO is closed as "stays false". Suppression works either way; only trigger-rate analytics depend on it. **Do not flip it in the same change as the rollout** — one variable at a time. |

Also worth closing first, though it does not block: **OQ6** (§9) — whether a
click reaches the real desk while a tour is up. Runbook item **A11a** answers it
in ten seconds and it is the last unknown about how the overlay behaves.

---

## 2. What the flag can and cannot do

`platform.contextual_tours = global.myDrumee.contextual_tours ? 1 : 0`
(`server-team/service/lib/env.js`). It is **boolean, per deployment**. There is
no percentage, no cohort, no per-user targeting.

**So there is no gradual ramp inside one deployment.** Staging has to come from
*which deployment* you turn on, not from what fraction of its users you reach.
Anyone planning a 1%-then-10% rollout should know that now: it would need a new
mechanism, and that mechanism is not in this plan.

What you *can* stage:

| Stage | Population | Purpose |
|---|---|---|
| S0 | One dev/stage box | The runbook itself runs here. Nothing about S0 is a rollout decision. |
| S1 | Internal / staff deployment | First real users. Small, reachable, and they will tell you. |
| S2 | One small production pod | First outside users. Pick the smallest, and one whose operator can be told in advance. |
| S3 | Everything else | Only after S2 has been quiet for a full week — every trigger is once-per-user-ever, so the interesting events are concentrated in the first days after enablement, when the whole population is unburned. |

---

## 3. Enabling one stage

1. Confirm the proc is applied on that deployment's `yp` schema:
   `SHOW PROCEDURE STATUS WHERE Db='yp' AND Name='drumate_tutorial_seen'`.
   **Missing proc + flag on = every tour fires, every write 500s, and every tour
   fires again next session.** This is the single worst way to turn it on.
2. Add `"contextual_tours": 1` to `myDrumee.json`; restart.
3. In a browser on that deployment: `Platform.get("contextual_tours")` → `1`.
4. Announce it to whoever fields support for that population.

## 4. What to watch, and what trouble looks like

| Signal | Where | First sign of trouble |
|---|---|---|
| Write failures | `drumate.tutorial_seen` error rate | Anything non-zero. The write is idempotent and first-write-wins, so a healthy rollout has **no** failures. A spike means the proc is missing or `entity.settings` is unparseable on that population. |
| Tours re-firing | Support ("I keep getting this"), and `SELECT COUNT(*) FROM yp.entity WHERE JSON_EXTRACT(settings,'$.tutorials_seen') IS NOT NULL` not growing | Suppression is not sticking. Most likely the write is failing silently (above) or the boot payload is not carrying `settings`. |
| Timestamps as strings | `SELECT JSON_EXTRACT(settings,'$.tutorials_seen') …` on a handful of rows | Quoted values mean the proc regressed to a `DECLARE`d variable (§4 S1). Cosmetic on day one, wrong for any later analysis. |
| The post-signup chain | Time from onboarding-complete to the reward flow appearing | ~20s instead of ~2s means a gated tour is leaving the fallback net as the only route home — the Phase 3 defect. Most visible on mobile signups. |
| Interruption complaints | Support, especially "why did this pop up while I was working" | Expected in small numbers. A cluster on one trigger is a signal about that trigger, not about the feature; `folder` (the desk's primary navigation gesture) is the one most likely to generate it. |
| `services_log` growth | Only if P3 landed as `"log": true` | Five rows per user, ever. Anything beyond that means `markSeen` is being called more than once per tour. |

## 5. Rollback

**Set `contextual_tours` to `0` (or remove the key) and restart.** That is the
whole rollback: a config change on the deployment, not a client deploy, and it
takes effect on the next page load.

What it does and does not undo:

- **Does:** no trigger fires; `markSeen()` returns early, so nothing further is
  written; the post-signup path reverts to the six-step tour.
- **Does not:** already-written `tutorials_seen` entries stay. That is correct —
  those users did see those tours. If you re-enable later they stay suppressed.
- **If you genuinely need to un-see a population** (e.g. the tours were shown
  broken), that is a data change, not a rollback:
  `UPDATE yp.entity SET settings = JSON_REMOVE(settings,'$.tutorials_seen') WHERE …`
  Scope it deliberately and take a backup; there is no undo.

The server endpoint and the proc are additive and can stay deployed through a
rollback — an old client ignores the `tutorials_seen` key.

---

## 6. Only then: removing the flag

Do this after S3 has been stable for at least one release, not as part of
enabling it. Three edits, in this order:

1. **`libs/tutorial-tours.js`** — delete `enabled()` and its call sites in
   `fire()` and `markSeen()`.
2. **`modules/desk/index.js` `_launchHomeTutorial`** — delete the
   `if (!Tours.enabled()) { this._showTutorial("full"); return true; }` branch.
   The post-signup path then always goes through `Tours.fire('workspace')`.
3. **`server-team/service/lib/env.js`** — delete the `platform.contextual_tours`
   line; drop the key from `myDrumee.json`.

Then delete the tests that assert the off behaviour (they will fail, correctly):
the kill-switch cases in `tutorial-tours-seen-set.test.js` and
`tutorial-tours-post-onboarding.test.js`.

### What survives, and must keep working

Removing the branch removes the *automatic* route to the six-step tour. **`full`
itself is permanent** — §2 D7: `tutorial_meeting` is reachable no other way, so
retiring `full` would make that widget dead code.

After the flag is gone, `full` must still be reachable by **both** of its
explicit entry points:

| Entry point | Route | Must still work |
|---|---|---|
| `?tutorial=1` | `_forcedTourId()` → `'full'` → `_showTutorial('full')` | ✅ — the `explicit` branch of `_launchHomeTutorial`, which is **not** the branch being deleted |
| Get help → **Product Tour** | `help_main` raises `start-product-tour` → `_startProductTour()` → `_showTutorial()` (defaults to `'full'`) | ✅ — never went through the flag at all |

Neither is gated on the seen-set, by design (D3): a person who asked for the tour
gets it. Verify both by hand after the removal — they are the only remaining
route to `tutorial_meeting`, and a test cannot tell you the tour renders.

`?tutorial=<id>` and `?tutorial=reset` also survive; `reset` remains dev-gated.

---

## 7. Sign-off

```
Stage:        [ ] S1 internal   [ ] S2 pod: __________   [ ] S3 all
Preconditions P1 runbook [ ]  P2 ops key [ ]  P3 privacy [ ]
Proc verified on schema: __________________
Enabled by: ______________  Date: __________  Build: __________
Watched for: ____ days     Issues: ______________________________
Decision:   [ ] proceed to next stage   [ ] hold   [ ] rolled back
```
