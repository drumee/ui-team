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
| P4 | **The interruption decision (§2b)** | Product answers "every existing user, or new accounts only". If the answer is "new accounts only", the backfill in §2b.2 must have **completed** on that deployment before its flag flips. |
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
| S3 | Everything else | Only after S2 has been quiet for a full week — every trigger is once-per-user-ever, so the interesting events are concentrated in the first days after enablement, when the whole population is unburned (which is the monitoring face of §2b). **S3 needs a named owner.** It is the largest stage by definition, there is no staging left after it, and "everything else" may itself deserve splitting by pod size or region. Whoever signs P2 decides whether S3 is one step or several, and records that here before it starts. |

---

## 2b. The decision nobody has made yet: who gets interrupted

**This is not a monitoring question and the staging table above does not answer
it.** Read this before signing P2.

Every trigger is *"first interaction with this surface"* — **not** *"new user"*.
For an account that has used Drumee for two years, the first interaction after
enablement is their next click on **+ New**, or their next workspace tile. So
flipping the flag on a deployment does not gently onboard new signups. It
interrupts **the entire active population of that deployment**, once each,
concentrated into the days right after the flip, when every flag is unburned.

The seen-set has no notion of account age. There is no flag-level way to limit
tours to new accounts.

### 2b.1 The decision — product, before P2

> **Is interrupting every existing active user, once each, the intent?**
> Or should the tours reach **new accounts only**?

This document deliberately does not answer it. It needs whoever owns onboarding
/ activation for the product — the same person or group who signs P2 — and it
must be answered **before** the flag is enabled anywhere beyond S1, because the
"new accounts only" answer requires work (2b.2) that has to land *first*.

### 2b.2 If the answer is "new accounts only": the backfill

Populate `tutorials_seen` for every account that existed before the cutover, on
that deployment, so their first click finds the tour already suppressed.

**Ordering is not negotiable: backfill completes, and only then the flag flips.**
The reverse order leaves a window in which the entire population is eligible, and
a tour shown in that window is recorded as genuinely seen — there is no undo for
a real trigger.

```sql
-- Dry run first. CUTOFF = the moment you intend to enable, unix seconds.
SET @cutoff := UNIX_TIMESTAMP('2026-09-01 00:00:00');

SELECT COUNT(*) FROM yp.entity
 WHERE type = 'drumate' AND ctime < @cutoff
   AND JSON_EXTRACT(IF(JSON_VALID(settings), settings, '{}'), '$.tutorials_seen') IS NULL;

-- Backfill. Sentinel 0, see 2b.3.
UPDATE yp.entity
   SET settings = JSON_MERGE_PATCH(
         IF(JSON_VALID(settings), settings, '{}'),
         JSON_OBJECT('tutorials_seen',
           JSON_OBJECT('workspace',0,'folder',0,'task',0,'share',0,'migrate',0))
       )
 WHERE type = 'drumate' AND ctime < @cutoff
   AND JSON_EXTRACT(IF(JSON_VALID(settings), settings, '{}'), '$.tutorials_seen') IS NULL;
```

The `IS NULL` clause matters: it means the backfill **never overwrites a map that
already exists**, so an account that genuinely saw a tour during S1 keeps its
real timestamp. Verified against a scratch schema, including that sibling keys
(`wallpaper`, `tutorial_done`) survive.

### 2b.3 The sentinel — because a backfill otherwise has no undo

Once written, a backfilled entry is **indistinguishable from a genuine one**.
Reversing the product decision would then mean guessing which rows to clear.

So backfilled entries are written with a timestamp of **`0`**, which no real
write can ever produce (`UNIX_TIMESTAMP()` is always > 0). A backfilled account
is exactly one whose `workspace` entry is `0`.

```sql
-- Reverse: remove ONLY backfilled maps, leaving genuine ones untouched.
UPDATE yp.entity
   SET settings = JSON_REMOVE(settings, '$.tutorials_seen')
 WHERE JSON_EXTRACT(settings, '$.tutorials_seen.workspace') = 0;
```

Removing the whole `tutorials_seen` object is safe here precisely because the
backfill only ever wrote to rows that had none. Also verified on a scratch
schema. **Take a backup before either statement anyway** — this is a bulk write
to a `mediumtext` column with a FULLTEXT index.

### 2b.4 Where the cutoff comes from

**`yp.entity.ctime`** — unix seconds, and `type = 'drumate'` selects user
accounts. Verified, not assumed: `yp.drumate` has **no** creation-time column at
all (its only time-ish columns are on `entity`), so a query written against
`drumate` would silently have nothing to filter on.

### 2b.5 How this interacts with §4 S7's migration

S7 already infers *all tours seen* for a pre-existing user whose settings carry
`tutorial_done: true` **and** no `tutorials_seen` map. The backfill population
overlaps that one.

- **For those users the backfill is redundant** — they were already suppressed
  by the inference — but it is harmless: the inference stops applying (the map
  now exists) and the map itself says the same thing. The two agree.
- **The one way they can disagree** is a *partial* backfill. If a tour is added
  to the registry later and the backfill list is not updated, a `tutorial_done`
  user ends up with a present-but-incomplete map: the inference no longer fires,
  and they get the new tour. If a sixth flagged tour is ever added, either extend
  the backfill or accept that outcome deliberately.
- Reversing the backfill (2b.3) restores the inference for them automatically,
  since it removes the whole map.

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
