# Stripe Payment — Phase 1 (Foundation + Core Subscription) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a secure, correct, single-path individual Free→Pro Stripe subscription flow — hosted Checkout → verified+idempotent webhook → one canonical `yp.quota` entitlement store that the upload gate actually reads — and delete the dead/duplicate payment code.

**Architecture:** Stripe owns price/subscription-state truth; `yp.plan` maps plan→`stripe_price_id`; the webhook is the only fulfilment path (signature→400, `yp.stripe_event` idempotency, a reducer that upserts `yp.quota` via `payment_apply_entitlement` and pushes a WS event); `disk_limit`/`disk_free` are repointed from `drumate.profile.quota` to `yp.quota`.

**Tech Stack:** MariaDB stored procs (schemas repo, deployed via `bin/patch-from-file … yp` over ssh to drumee.in), Node service classes (`server-team`, ACL-JSON-registered), Stripe Node SDK (upgrade off v9 + pinned `apiVersion`), Backbone/Marionette + Skeletons FE (`ui-team`).

Spec: [docs/superpowers/specs/2026-06-22-stripe-payment-rebuild-design.md](../specs/2026-06-22-stripe-payment-rebuild-design.md)

---

## Conventions & Verification Toolbox (read once; tasks reference these)

**No test runner exists** in any of the 3 repos (no jest/mocha/vitest, no `npm test`). Do **not** author `*.test.js`. The verification levers are:

- **TB-CHECK** — JS syntax gate: `node --check <file>` → exit 0, no output = pass. (Cannot see injected globals `SERVICE/Skeletons/Visitor/Wm` or Kind wiring — those need TB-SMOKE.)
- **TB-DB** — deploy + verify a yp proc/table (runs **on drumee.in**, engine uses the local mysqld socket):
  ```bash
  # one path per line, 2-space indent, appended to patches/manifest.txt
  ssh drumee.in 'cd /home/vudangnt/schemas && sudo bin/patch-from-file <type>/path/file.sql yp'
  ssh drumee.in 'echo "SHOW CREATE PROCEDURE yp.<name>\G" | sudo mysql'
  ssh drumee.in 'echo "<a CALL/SELECT>" | sudo mysql -t'
  ```
- **TB-WEBHOOK** — Stripe CLI is **absent** locally and on drumee.in. Verify with a crafted signed POST using the installed Node SDK:
  ```bash
  node -e 'const s=require("/Volumes/Data/drumee/server-team/node_modules/stripe")("sk_test_x");
    const payload=JSON.stringify({id:"evt_test_1",type:"checkout.session.completed",data:{object:{metadata:{entity_type:"user",entity_id:"181ffe62181ffe67",plan:"pro",period:"month"},subscription:"sub_test",current_period_end:1893456000}}});
    const h=s.webhooks.generateTestHeaderString({payload,secret:process.env.WHSEC});
    console.log(JSON.stringify({payload,h}));'
  # POST it (valid sig → 200; tamper one byte of payload → 400):
  curl -i -X POST "https://drumee.in/-/vudangnt/svc/?service=payment.webhook" \
    -H "stripe-signature: <h>" -H "content-type: application/json" --data "<payload>"
  ```
  (`WHSEC` = the `stripe_endpointSecret` sys_conf value for the vudangnt test endpoint.)
- **TB-SMOKE** — FE/flow: `cd ui-team && npm run dev` (webpack watch + rsync), then **mandatory** `ssh drumee.in 'sudo drumee restart vudangnt/service'` (process name order is `vudangnt/service`), hard-refresh. Sign in at `https://drumee.in/-/vudangnt/#/welcome/signin` (test account `vudangnt@gmail.com` / `Admin@123!!!`, drumate_id `181ffe62181ffe67`). Stripe test card `4242 4242 4242 4242`.
- **TB-SRV-RESTART** — after any server `service/` or `acl/` change: `ssh drumee.in 'sudo drumee restart vudangnt/service'` (ACL/route registration is read at process start; `node --check` won't surface it).

**Hard rules:**
- SQL files: one routine per file, `DELIMITER $` … `DROP … IF EXISTS x$` … `CREATE … $` … `DELIMITER ;`. Tables use `CREATE TABLE IF NOT EXISTS`. Append every new/edited `.sql` path to `patches/manifest.txt`.
- **Never `DROP+CREATE` `yp.quota`** (holds rows + a `quota_usage` FK + a `disk_usage` trigger) — use `ALTER … ADD COLUMN IF NOT EXISTS`.
- Webhook raw body = `this.input.rawString()` (string). `this.input.raw()` returns an **array of Buffers** — that is the latent bug; do not use it for `constructEvent`.
- Invalid signature → `this.exception.bad_request('<locale_key>')` (HTTP 400, blocking) — never `debug()` + fall through.
- **Never** `console.log` `stripe_skey` / `stripe_endpointSecret`.
- FE `onWsMessage(service, data, options)` switches on the **first arg**, never `options.service`.
- Globals are injected in FE (no imports): `SERVICE Skeletons Visitor Wm LetcBox _a LOCALE`.
- Class names are load-bearing (Kind lookup + terser keep_classnames). Deleting a widget = delete dir + remove `seeds.js` entry + every `{kind:'…'}`/`import('…')` reference (grep-verify zero first).
- Per git-branch rule: do not merge/switch the working branches without explicit user approval (the branches already exist).

---

## Group A — Setup

### Task A1: Create the schemas feature branch

**Files:** none (git only).

- [ ] **Step 1: Create + confirm the branch** (schemas is on `test` and has NO `feature/stripe-payment` branch — this is a known trap)

```bash
git -C /Volumes/Data/drumee/schemas checkout -b feature/stripe-payment
git -C /Volumes/Data/drumee/schemas rev-parse --abbrev-ref HEAD   # => feature/stripe-payment
```

- [ ] **Step 2: Capture LIVE DDL before any change** (live may differ from repo files; drives ALTER-vs-CREATE)

```bash
ssh drumee.in 'for s in "SHOW CREATE TABLE yp.quota\G" "SHOW CREATE TABLE yp.plan\G" "SHOW TABLES FROM yp LIKE \"stripe_event\"" "SHOW COLUMNS FROM yp.quota" "SELECT domain_id,payer_id,plan,JSON_VALUE(quota,\"$.disk\") disk FROM yp.quota LIMIT 5"; do echo "=== $s ==="; echo "$s" | sudo mysql -t; done'
```
Expected: `yp.quota` has `id` PK + `ctime`/`mtime` + UNIQUE `(domain_id,payer_id)`; `yp.stripe_event` does NOT exist; free row `payer_id='ffffffffffffffff', domain_id=1`. **Record the real UNIQUE key** — `payment_apply_entitlement`'s `ON DUPLICATE KEY` depends on it being `(domain_id,payer_id)`.

---

## Group B — Schemas (DB)

All files under `/Volumes/Data/drumee/schemas/`. Deploy each with TB-DB and append its path to `patches/manifest.txt` (Task B-last).

### Task B1: Rebuild `yp.plan` as catalog + entitlement registry

**Files:**
- Modify: `yellow_page/tables/plan.sql`

- [ ] **Step 1: Replace the stub with the registry DDL + seed**

```sql
-- yp.plan is a CATALOG (no customer data) — safe to DROP+CREATE. Price truth = Stripe;
-- this table stores stripe_price_id per (plan_code, entity_type, period, currency) + the quota a plan grants.
DROP TABLE IF EXISTS `plan`;
CREATE TABLE IF NOT EXISTS `plan` (
  `sys_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `plan_code` varchar(30) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT 'free',
  `entity_type` enum('user','org') NOT NULL DEFAULT 'user',
  `period` enum('free','month','year') NOT NULL DEFAULT 'free',
  `currency` char(3) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT 'eur',
  `stripe_price_id` varchar(64) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL,
  `stripe_product_id` varchar(64) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL,
  `quota` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`quota`)),
  `features` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`features`)),
  `active` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`sys_id`),
  UNIQUE KEY `plan_id` (`plan_code`,`entity_type`,`period`,`currency`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- quota JSON MUST keep $.disk (+ $.desk_disk/$.hub_disk) — disk_limit/disk_free read those keys.
REPLACE INTO `plan` (plan_code,entity_type,period,currency,quota,features,active,stripe_price_id) VALUES
 ('free','user','free','eur', JSON_OBJECT('plan','free','disk',20000000000,'desk_disk',20000000000,'hub_disk',20000000000,'seat',0,'organization',0,'history_length',0), JSON_OBJECT(), 1, NULL),
 ('pro','user','month','eur', JSON_OBJECT('plan','pro','disk',50000000000,'desk_disk',50000000000,'hub_disk',50000000000,'seat',5,'organization',1,'history_length',7), JSON_OBJECT(), 1, NULL),
 ('pro','user','year','eur',  JSON_OBJECT('plan','pro','disk',50000000000,'desk_disk',50000000000,'hub_disk',50000000000,'seat',5,'organization',1,'history_length',7), JSON_OBJECT(), 1, NULL);
-- stripe_price_id stays NULL here; the real test price ids are set by a one-off data step (Task E1), NOT in the manifest seed.
```

- [ ] **Step 2: Deploy + verify (TB-DB)**

```bash
ssh drumee.in 'cd /home/vudangnt/schemas && sudo bin/patch-from-file yellow_page/tables/plan.sql yp'
ssh drumee.in 'echo "SELECT plan_code,period,currency,stripe_price_id,JSON_VALUE(quota,\"$.disk\") disk FROM yp.plan" | sudo mysql -t'
```
Expected: free + pro(month) + pro(year) rows; `disk` = 20000000000 / 50000000000.

- [ ] **Step 3: Commit**

```bash
git -C /Volumes/Data/drumee/schemas add yellow_page/tables/plan.sql
git -C /Volumes/Data/drumee/schemas commit -m "feat(payment): rebuild yp.plan as stripe catalog + entitlement registry"
```

### Task B2: Create `yp.stripe_event` idempotency log + helper procs

**Files:**
- Create: `yellow_page/tables/stripe_event.sql`
- Create: `yellow_page/procedures/subscription/stripe_event_seen.sql`
- Create: `yellow_page/procedures/subscription/stripe_event_processed.sql`

- [ ] **Step 1: Table**

```sql
-- yellow_page/tables/stripe_event.sql
CREATE TABLE IF NOT EXISTS `stripe_event` (
  `sys_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `event_id` varchar(64) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `type` varchar(64) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL,
  `received_at` int(11) unsigned NOT NULL,
  `processed_at` int(11) unsigned DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`payload`)),
  PRIMARY KEY (`sys_id`),
  UNIQUE KEY `event_id` (`event_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
```

- [ ] **Step 2: `stripe_event_seen` (INSERT IGNORE → return duplicate flag)**

```sql
-- yellow_page/procedures/subscription/stripe_event_seen.sql
DELIMITER $
DROP PROCEDURE IF EXISTS `stripe_event_seen`$
CREATE PROCEDURE `stripe_event_seen`(
  IN _event_id VARCHAR(64) CHARACTER SET ascii,
  IN _type VARCHAR(64) CHARACTER SET ascii
)
BEGIN
  DECLARE _rows INT DEFAULT 0;
  INSERT IGNORE INTO stripe_event (event_id, type, received_at)
  VALUES (_event_id, _type, UNIX_TIMESTAMP());
  SET _rows = ROW_COUNT();              -- 1 = first time inserted, 0 = already present
  SELECT IF(_rows = 1, 0, 1) AS duplicate;
END $
DELIMITER ;
```

- [ ] **Step 3: `stripe_event_processed` (mark done)**

```sql
-- yellow_page/procedures/subscription/stripe_event_processed.sql
DELIMITER $
DROP PROCEDURE IF EXISTS `stripe_event_processed`$
CREATE PROCEDURE `stripe_event_processed`(
  IN _event_id VARCHAR(64) CHARACTER SET ascii
)
BEGIN
  UPDATE stripe_event SET processed_at = UNIX_TIMESTAMP() WHERE event_id = _event_id;
END $
DELIMITER ;
```

- [ ] **Step 4: Deploy + verify (TB-DB)**

```bash
ssh drumee.in 'cd /home/vudangnt/schemas && for f in yellow_page/tables/stripe_event.sql yellow_page/procedures/subscription/stripe_event_seen.sql yellow_page/procedures/subscription/stripe_event_processed.sql; do sudo bin/patch-from-file $f yp; done'
ssh drumee.in 'echo "CALL yp.stripe_event_seen(\"evt_dedupe_test\",\"t\"); CALL yp.stripe_event_seen(\"evt_dedupe_test\",\"t\");" | sudo mysql -t'
```
Expected: first call `duplicate=0`, second `duplicate=1`. Clean up: `ssh drumee.in 'echo "DELETE FROM yp.stripe_event WHERE event_id=\"evt_dedupe_test\"" | sudo mysql'`

- [ ] **Step 5: Commit**

```bash
git -C /Volumes/Data/drumee/schemas add yellow_page/tables/stripe_event.sql yellow_page/procedures/subscription/stripe_event_seen.sql yellow_page/procedures/subscription/stripe_event_processed.sql
git -C /Volumes/Data/drumee/schemas commit -m "feat(payment): add yp.stripe_event idempotency log + seen/processed procs"
```

### Task B3: Extend `yp.quota` with `source` + `period_end` (additive ALTER)

**Files:**
- Create: `yellow_page/patches/2026-06-22-quota-entitlement-cols.sql`

- [ ] **Step 1: Additive ALTER (never DROP+CREATE — see Conventions)**

```sql
-- yellow_page/patches/2026-06-22-quota-entitlement-cols.sql
-- yp.quota keeps its (domain_id,payer_id) key + quota JSON ($.disk drives the VIRTUAL `disk` col + enforcement).
-- Add provenance + expiry so the reducer/UI know where entitlement came from and when it lapses.
ALTER TABLE `quota`
  ADD COLUMN IF NOT EXISTS `source` varchar(16) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS `period_end` int(11) unsigned DEFAULT NULL;
```

- [ ] **Step 2: Deploy + verify idempotent (TB-DB)**

```bash
ssh drumee.in 'cd /home/vudangnt/schemas && sudo bin/patch-from-file yellow_page/patches/2026-06-22-quota-entitlement-cols.sql yp && sudo bin/patch-from-file yellow_page/patches/2026-06-22-quota-entitlement-cols.sql yp'
ssh drumee.in 'echo "SHOW COLUMNS FROM yp.quota" | sudo mysql -t | grep -E "source|period_end"'
```
Expected: re-run errors NOT (ADD COLUMN IF NOT EXISTS is idempotent); `source` + `period_end` present; existing rows untouched.

- [ ] **Step 3: Commit**

```bash
git -C /Volumes/Data/drumee/schemas add yellow_page/patches/2026-06-22-quota-entitlement-cols.sql
git -C /Volumes/Data/drumee/schemas commit -m "feat(payment): add source+period_end to yp.quota (additive)"
```

### Task B4: `payment_apply_entitlement` — canonical `yp.quota` upsert (reducer target)

**Files:**
- Create: `yellow_page/procedures/subscription/payment_apply_entitlement.sql`

- [ ] **Step 1: Write the proc** (replaces broken `create_quota`/`update_quota`/`create_plan`)

```sql
-- yellow_page/procedures/subscription/payment_apply_entitlement.sql
DELIMITER $
DROP PROCEDURE IF EXISTS `payment_apply_entitlement`$
CREATE PROCEDURE `payment_apply_entitlement`(
  IN _entity_id VARCHAR(16) CHARACTER SET ascii,   -- payer (user id); P1 = individual
  IN _plan_code VARCHAR(30) CHARACTER SET ascii,
  IN _period_end INT(11) UNSIGNED
)
BEGIN
  DECLARE _domain_id INT(11) UNSIGNED;
  DECLARE _plan_quota JSON;
  -- 1) domain for this payer (mirror get_quota cascade key)
  SELECT domain_id FROM yp.drumate WHERE id = _entity_id LIMIT 1 INTO _domain_id;
  SET _domain_id = IFNULL(_domain_id, 1);
  -- 2) quota JSON the plan grants (from the rebuilt catalog)
  SELECT quota FROM yp.plan WHERE plan_code = _plan_code AND entity_type = 'user' AND active = 1 LIMIT 1 INTO _plan_quota;
  SET _plan_quota = IFNULL(_plan_quota, JSON_OBJECT('plan', _plan_code, 'disk', 20000000000));
  -- 3) canonical upsert (UNIQUE key (domain_id,payer_id) — confirmed in Task A1)
  INSERT INTO yp.quota (domain_id, payer_id, plan, quota, source, period_end, ctime, mtime)
  VALUES (_domain_id, _entity_id, _plan_code, JSON_SET(_plan_quota, '$.plan', _plan_code), 'stripe', _period_end, UNIX_TIMESTAMP(), UNIX_TIMESTAMP())
  ON DUPLICATE KEY UPDATE
    plan = _plan_code, quota = VALUES(quota), source = 'stripe', period_end = _period_end, mtime = UNIX_TIMESTAMP();
  -- 4) return applied row for reducer/WS payload
  SELECT _entity_id AS entity_id, _domain_id AS domain_id, _plan_code AS plan,
         _period_end AS period_end, JSON_VALUE(_plan_quota, '$.disk') AS disk;
END $
DELIMITER ;
```

- [ ] **Step 2: Deploy + verify idempotent upsert (TB-DB)**

```bash
ssh drumee.in 'cd /home/vudangnt/schemas && sudo bin/patch-from-file yellow_page/procedures/subscription/payment_apply_entitlement.sql yp'
ssh drumee.in 'echo "CALL yp.payment_apply_entitlement(\"181ffe62181ffe67\",\"pro\",UNIX_TIMESTAMP()+2592000)" | sudo mysql -t'
ssh drumee.in 'echo "SELECT plan,source,JSON_VALUE(quota,\"$.disk\") disk FROM yp.quota WHERE payer_id=\"181ffe62181ffe67\"" | sudo mysql -t'
```
Expected: returns the applied row; `yp.quota` has ONE row for that payer, `plan=pro`, `source=stripe`, `disk=50000000000`. Re-run the CALL → still one row (mtime bumped). (Reset for clean smoke later: `CALL yp.payment_apply_entitlement('181ffe62181ffe67','free',NULL)`.)

- [ ] **Step 3: Commit**

```bash
git -C /Volumes/Data/drumee/schemas add yellow_page/procedures/subscription/payment_apply_entitlement.sql
git -C /Volumes/Data/drumee/schemas commit -m "feat(payment): payment_apply_entitlement — canonical yp.quota upsert"
```

### Task B5: `payment_get_catalog` + `payment_get_plan` (no markup math)

**Files:**
- Create: `yellow_page/procedures/subscription/payment_get_catalog.sql`
- Create: `yellow_page/procedures/subscription/payment_get_plan.sql`

- [ ] **Step 1: `payment_get_catalog` (the FE catalog)**

```sql
-- yellow_page/procedures/subscription/payment_get_catalog.sql
DELIMITER $
DROP PROCEDURE IF EXISTS `payment_get_catalog`$
CREATE PROCEDURE `payment_get_catalog`(
  IN _currency CHAR(3) CHARACTER SET ascii,
  IN _entity_type VARCHAR(8) CHARACTER SET ascii
)
BEGIN
  -- NO price math. Price truth = Stripe; return stripe_price_id + granted quota.
  SELECT plan_code, entity_type, period, currency, stripe_price_id, stripe_product_id, quota, features
  FROM yp.plan
  WHERE active = 1
    AND (_currency IS NULL OR _currency = '' OR currency = _currency)
    AND (_entity_type IS NULL OR _entity_type = '' OR entity_type = _entity_type)
  ORDER BY FIELD(plan_code,'free','pro','advanced','company'), FIELD(period,'free','month','year');
END $
DELIMITER ;
```

- [ ] **Step 2: `payment_get_plan` (single row for checkout price lookup)**

```sql
-- yellow_page/procedures/subscription/payment_get_plan.sql
DELIMITER $
DROP PROCEDURE IF EXISTS `payment_get_plan`$
CREATE PROCEDURE `payment_get_plan`(
  IN _plan_code VARCHAR(30) CHARACTER SET ascii,
  IN _period VARCHAR(8) CHARACTER SET ascii,
  IN _currency CHAR(3) CHARACTER SET ascii
)
BEGIN
  SELECT plan_code, entity_type, period, currency, stripe_price_id, stripe_product_id, quota
  FROM yp.plan
  WHERE plan_code = _plan_code AND period = _period AND currency = _currency AND active = 1
  LIMIT 1;
END $
DELIMITER ;
```

- [ ] **Step 3: Deploy + verify (TB-DB)**

```bash
ssh drumee.in 'cd /home/vudangnt/schemas && for f in yellow_page/procedures/subscription/payment_get_catalog.sql yellow_page/procedures/subscription/payment_get_plan.sql; do sudo bin/patch-from-file $f yp; done'
ssh drumee.in 'echo "CALL yp.payment_get_catalog(\"eur\",\"user\")" | sudo mysql -t'
ssh drumee.in 'echo "CALL yp.payment_get_plan(\"pro\",\"month\",\"eur\")" | sudo mysql -t'
```
Expected: catalog returns free+pro rows (no `*120/100` column); `payment_get_plan('pro','month','eur')` returns one row.

- [ ] **Step 4: Commit**

```bash
git -C /Volumes/Data/drumee/schemas add yellow_page/procedures/subscription/payment_get_catalog.sql yellow_page/procedures/subscription/payment_get_plan.sql
git -C /Volumes/Data/drumee/schemas commit -m "feat(payment): payment_get_catalog + payment_get_plan (price_id from yp.plan, no markup)"
```

### Task B6: `payment_get_payer` + `payment_get_subscription`

**Files:**
- Create: `yellow_page/procedures/subscription/payment_get_payer.sql`
- Create: `yellow_page/procedures/subscription/payment_get_subscription.sql`

- [ ] **Step 1: `payment_get_payer` (email/name/domain + existing customer_id for checkout)**

```sql
-- yellow_page/procedures/subscription/payment_get_payer.sql
DELIMITER $
DROP PROCEDURE IF EXISTS `payment_get_payer`$
CREATE PROCEDURE `payment_get_payer`(
  IN _uid VARCHAR(16) CHARACTER SET ascii
)
BEGIN
  SELECT d.id, d.email, d.fullname, d.domain_id, s.customer_id
  FROM yp.drumate d
  LEFT JOIN yp.subscription_new s ON s.entity_id = d.id
  WHERE d.id = _uid
  LIMIT 1;
END $
DELIMITER ;
```

- [ ] **Step 2: `payment_get_subscription` (billing panel state: sub mirror + canonical entitlement)**

```sql
-- yellow_page/procedures/subscription/payment_get_subscription.sql
DELIMITER $
DROP PROCEDURE IF EXISTS `payment_get_subscription`$
CREATE PROCEDURE `payment_get_subscription`(
  IN _entity_id VARCHAR(16) CHARACTER SET ascii
)
BEGIN
  SELECT s.entity_id, s.subscription_id, s.customer_id, s.plan, s.period, s.recurring,
         s.price, s.offer_price, s.status, s.ctime,
         q.plan AS entitlement_plan, JSON_VALUE(q.quota,'$.disk') AS disk_limit, q.period_end
  FROM yp.subscription_new s
  LEFT JOIN yp.quota q ON q.payer_id = s.entity_id
  WHERE s.entity_id = _entity_id;
END $
DELIMITER ;
```

- [ ] **Step 3: Deploy + verify (TB-DB)**

```bash
ssh drumee.in 'cd /home/vudangnt/schemas && for f in yellow_page/procedures/subscription/payment_get_payer.sql yellow_page/procedures/subscription/payment_get_subscription.sql; do sudo bin/patch-from-file $f yp; done'
ssh drumee.in 'echo "CALL yp.payment_get_payer(\"181ffe62181ffe67\")" | sudo mysql -t'
```
Expected: `payment_get_payer` returns the test user's email/fullname/domain_id (+ customer_id if any). `payment_get_subscription` compiles (returns rows only after a subscription exists).

- [ ] **Step 4: Commit**

```bash
git -C /Volumes/Data/drumee/schemas add yellow_page/procedures/subscription/payment_get_payer.sql yellow_page/procedures/subscription/payment_get_subscription.sql
git -C /Volumes/Data/drumee/schemas commit -m "feat(payment): payment_get_payer + payment_get_subscription"
```

### Task B7: Repoint `disk_limit` to `yp.quota` (the load-bearing enforcement fix)

**Files:**
- Modify: `yellow_page/procedures/utils/disk_limit.sql` (the `SELECT quota FROM yp.drumate …` read, ~line 33)

- [ ] **Step 1: Read the current file in full** so the surrounding usage SUMs / `LEAST` math / result-set stay intact:

```bash
sed -n '1,90p' /Volumes/Data/drumee/schemas/yellow_page/procedures/utils/disk_limit.sql
```

- [ ] **Step 2: Add `_domain_id` to the `DECLARE` block and replace the single drumate read with the `get_quota` cascade.** Replace exactly:

```sql
  SELECT quota FROM yp.drumate WHERE id = _owner_id INTO _quota;
```
with:
```sql
  -- Read entitlement from yp.quota (canonical), NOT drumate.profile.quota.
  -- Cascade mirrors get_quota: payer -> org/domain (>1) -> free fallback row.
  SELECT domain_id FROM yp.drumate WHERE id = _owner_id INTO _domain_id;
  SELECT quota FROM yp.quota WHERE payer_id = _owner_id LIMIT 1 INTO _quota;
  IF _quota IS NULL AND _domain_id > 1 THEN
    SELECT quota FROM yp.quota WHERE domain_id = _domain_id LIMIT 1 INTO _quota;
  END IF;
  IF _quota IS NULL THEN
    SELECT quota FROM yp.quota WHERE payer_id = 'ffffffffffffffff' AND domain_id = 1 LIMIT 1 INTO _quota;
  END IF;
```
And add to the `DECLARE` section (with the other declarations): `DECLARE _domain_id INT(11) UNSIGNED;`

- [ ] **Step 3: Deploy + verify the fix actually moves with `yp.quota` (TB-DB)**

```bash
# Set the test payer to FREE first, then to PRO, and confirm disk_limit's output changes:
ssh drumee.in 'echo "CALL yp.payment_apply_entitlement(\"181ffe62181ffe67\",\"free\",NULL)" | sudo mysql'
ssh drumee.in 'cd /home/vudangnt/schemas && sudo bin/patch-from-file yellow_page/procedures/utils/disk_limit.sql yp'
ssh drumee.in 'echo "SHOW CREATE PROCEDURE yp.disk_limit\G" | sudo mysql | grep -c "yp.quota"'   # >=1 proves it reads yp.quota
ssh drumee.in 'echo "CALL yp.disk_limit(\"181ffe62181ffe67\")" | sudo mysql -t'                    # free-based available_disk
ssh drumee.in 'echo "CALL yp.payment_apply_entitlement(\"181ffe62181ffe67\",\"pro\",UNIX_TIMESTAMP()+2592000)" | sudo mysql'
ssh drumee.in 'echo "CALL yp.disk_limit(\"181ffe62181ffe67\")" | sudo mysql -t'                    # pro-based (larger) available_disk
```
Expected: the proc body greps to `yp.quota`; the SAME `disk_limit` call returns a larger available_disk after the pro entitlement than after free. **This is the core P1 correctness proof.**

- [ ] **Step 4: Commit**

```bash
git -C /Volumes/Data/drumee/schemas add yellow_page/procedures/utils/disk_limit.sql
git -C /Volumes/Data/drumee/schemas commit -m "fix(payment): disk_limit reads yp.quota (entitlement reaches the gate)"
```

### Task B8: Repoint `disk_free` to `yp.quota` (same cascade)

**Files:**
- Modify: `yellow_page/procedures/utils/disk_free.sql` (the `SELECT quota FROM yp.drumate …` read, ~line 30)

- [ ] **Step 1: Read the file** (note it legitimately `DROP FUNCTION`s both `disk_used` and `disk_free` at the top — keep BOTH drops; it CREATEs only `disk_free`):

```bash
sed -n '1,70p' /Volumes/Data/drumee/schemas/yellow_page/procedures/utils/disk_free.sql
```

- [ ] **Step 2: Add `_domain_id` to `DECLARE` and replace the drumate read** with the same 3-case cascade as Task B7 Step 2 (payer → domain>1 → free row). Keep `RETURNS double DETERMINISTIC` and the final `RETURN _l_disk` unchanged.

- [ ] **Step 3: Deploy + verify (TB-DB)**

```bash
ssh drumee.in 'cd /home/vudangnt/schemas && sudo bin/patch-from-file yellow_page/procedures/utils/disk_free.sql yp'
ssh drumee.in 'echo "CALL yp.payment_apply_entitlement(\"181ffe62181ffe67\",\"free\",NULL); SELECT yp.disk_free(\"181ffe62181ffe67\") free_after_free;" | sudo mysql -t'
ssh drumee.in 'echo "CALL yp.payment_apply_entitlement(\"181ffe62181ffe67\",\"pro\",UNIX_TIMESTAMP()+2592000); SELECT yp.disk_free(\"181ffe62181ffe67\") free_after_pro;" | sudo mysql -t'
```
Expected: function compiles; `free_after_pro` > `free_after_free`.

- [ ] **Step 4: Commit**

```bash
git -C /Volumes/Data/drumee/schemas add yellow_page/procedures/utils/disk_free.sql
git -C /Volumes/Data/drumee/schemas commit -m "fix(payment): disk_free reads yp.quota"
```

### Task B9: Repoint `my_disk_limit` to `yp.quota` (consistency — the 3rd reader)

**Files:**
- Modify: `yellow_page/procedures/directory/my_disk_limit.sql` (the `SELECT quota FROM yp.drumate WHERE id=_uid` read, ~line 21)

- [ ] **Step 1:** Read it; replace the single `SELECT quota FROM yp.drumate WHERE id = _uid INTO _quota;` with the same cascade keyed on `_uid` (it's the payer): `SELECT domain_id FROM yp.drumate WHERE id=_uid INTO _domain_id;` then the 3-case `yp.quota` read (payer=`_uid` → domain>1 → free row). Add `DECLARE _domain_id INT(11) UNSIGNED;`.

- [ ] **Step 2: Deploy + verify (TB-DB)**

```bash
ssh drumee.in 'cd /home/vudangnt/schemas && sudo bin/patch-from-file yellow_page/procedures/directory/my_disk_limit.sql yp'
ssh drumee.in 'echo "SHOW CREATE PROCEDURE yp.my_disk_limit\G" | sudo mysql | grep -c yp.quota'   # >=1
```

- [ ] **Step 3: Commit**

```bash
git -C /Volumes/Data/drumee/schemas add yellow_page/procedures/directory/my_disk_limit.sql
git -C /Volumes/Data/drumee/schemas commit -m "fix(payment): my_disk_limit reads yp.quota (3rd enforcement reader)"
```

### Task B10: Register all P1 schema files in the manifest

**Files:**
- Modify: `patches/manifest.txt`

- [ ] **Step 1: Append every P1 path (tables BEFORE procs that reference them), 2-space indent:**

```
  yellow_page/tables/plan.sql
  yellow_page/tables/stripe_event.sql
  yellow_page/patches/2026-06-22-quota-entitlement-cols.sql
  yellow_page/procedures/subscription/stripe_event_seen.sql
  yellow_page/procedures/subscription/stripe_event_processed.sql
  yellow_page/procedures/subscription/payment_apply_entitlement.sql
  yellow_page/procedures/subscription/payment_get_catalog.sql
  yellow_page/procedures/subscription/payment_get_plan.sql
  yellow_page/procedures/subscription/payment_get_payer.sql
  yellow_page/procedures/subscription/payment_get_subscription.sql
  yellow_page/procedures/utils/disk_limit.sql
  yellow_page/procedures/utils/disk_free.sql
  yellow_page/procedures/directory/my_disk_limit.sql
```

- [ ] **Step 2: Verify a clean end-to-end manifest run (TB-DB)**

```bash
ssh drumee.in 'cd /home/vudangnt/schemas && sudo bin/patch-from-manifest patches/ 2>&1 | tail -20'
```
Expected: runs clean (idempotent; re-applies all in order). Re-run → still clean.

- [ ] **Step 3: Commit**

```bash
git -C /Volumes/Data/drumee/schemas add patches/manifest.txt patches/changelog.txt
git -C /Volumes/Data/drumee/schemas commit -m "chore(payment): stage P1 payment schema in manifest"
```
(Also add a dated entry to `patches/changelog.txt` mirroring the manifest additions, per repo convention.)

---

## Group C — Server (server-team)

All files under `/Volumes/Data/drumee/server-team/`. After any `service/` or `acl/` change, run **TB-SRV-RESTART**.

### Task C1: Stripe init module (apiVersion pin, mode flag, no secret logging)

**Files:**
- Create: `service/lib/stripe.js`

- [ ] **Step 1: Write the module**

```js
// service/lib/stripe.js
// Single source for the Stripe client. Reads secrets from sys_conf; NEVER logs them.
const { Cache } = require('@drumee/server-essentials');
const Stripe = require('stripe');

// Pin to the apiVersion the installed SDK bundles (set after the C6 upgrade; see that task).
const API_VERSION = '2025-04-30.basil';

let _client = null;

function stripeMode() {
  return Cache.getSysConf('stripe_mode') || 'test'; // 'test' | 'live'
}

function stripeClient() {
  if (_client) return _client;
  const skey = Cache.getSysConf('stripe_skey');
  if (!skey) throw new Error('STRIPE_KEY_MISSING'); // do NOT log skey
  _client = new Stripe(skey, { apiVersion: API_VERSION });
  return _client;
}

function endpointSecret() {
  return Cache.getSysConf('stripe_endpointSecret'); // returned, never logged
}

module.exports = { stripeClient, endpointSecret, stripeMode, API_VERSION };
```

- [ ] **Step 2: Verify (TB-CHECK)**

```bash
node --check /Volumes/Data/drumee/server-team/service/lib/stripe.js
```
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git -C /Volumes/Data/drumee/server-team add service/lib/stripe.js
git -C /Volumes/Data/drumee/server-team commit -m "feat(payment): stripe init module (apiVersion pin, mode, no secret logging)"
```

### Task C2: `service/private/payment.js` (catalog + checkout + subscription_status + portal stub)

**Files:**
- Create: `service/private/payment.js`

- [ ] **Step 1: Write the service class**

```js
// service/private/payment.js
const { Entity } = require('@drumee/server-core');
const { stripeClient } = require('../lib/stripe');

class __private_payment extends Entity {
  initialize(opt) {
    super.initialize(opt);
    this.stripe = stripeClient(); // pinned client; never logs the key
  }

  // Priced catalog straight from yp.plan (stripe_price_id is truth; no per-request stripe.search).
  async catalog() {
    const rows = await this.yp.await_proc('payment_get_catalog', 'eur', 'user');
    this.output.data({ plans: rows });
  }

  // Individual Free->Pro hosted Checkout (P1). entity = this.uid.
  async checkout() {
    const plan = this.input.use('plan', 'pro');
    const period = this.input.need('period');           // 'month' | 'year'
    const seats = this.input.use('seats', 1);
    const plan_row = await this.yp.await_proc('payment_get_plan', plan, period, 'eur');
    if (!plan_row || !plan_row.stripe_price_id) {
      return this.output.data({ status: 'NO_PRICE' });
    }
    const payer = await this.yp.await_proc('payment_get_payer', this.uid);
    // ensure a Stripe customer keyed by metadata.id = uid (idempotent across checkouts)
    let customer_id = payer && payer.customer_id;
    if (!customer_id) {
      const found = await this.stripe.customers.search({ query: `metadata['id']:'${this.uid}'` });
      customer_id = (found.data[0] && found.data[0].id) || null;
    }
    if (!customer_id) {
      const created = await this.stripe.customers.create({
        email: payer && payer.email, name: payer && payer.fullname, metadata: { id: this.uid },
      });
      customer_id = created.id;
    }
    const success_url = this.input.servicepath({ service: 'callback.check_out_success' }) + '&session_id={CHECKOUT_SESSION_ID}';
    const cancel_url = this.input.servicepath({ service: 'callback.check_out_cancel' });
    const metadata = { entity_type: 'user', entity_id: this.uid, plan, period };
    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customer_id,
      line_items: [{ price: plan_row.stripe_price_id, quantity: seats }],
      subscription_data: { metadata },
      metadata,
      success_url,
      cancel_url,
    });
    this.output.data({ url: session.url, id: session.id });
  }

  async subscription_status() {
    const row = await this.yp.await_proc('payment_get_subscription', this.uid);
    this.output.data(row || {});
  }

  // P2 stub so the route/ACL exist now (Stripe Billing Portal lands in Phase 2).
  async portal() {
    this.output.data({ status: 'NOT_IMPLEMENTED' });
  }
}

module.exports = __private_payment;
```

- [ ] **Step 2: Verify (TB-CHECK)**

```bash
node --check /Volumes/Data/drumee/server-team/service/private/payment.js
```
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git -C /Volumes/Data/drumee/server-team add service/private/payment.js
git -C /Volumes/Data/drumee/server-team commit -m "feat(payment): payment service (catalog, checkout, subscription_status, portal stub)"
```

### Task C3: `service/public/stripe_webhook.js` (verify→400, idempotency, reducer→entitlement+WS)

**Files:**
- Create: `service/public/stripe_webhook.js`

- [ ] **Step 1: Add the locale key** for the 400 message (server locale): add `"_webhook_signature_invalid": "Invalid Stripe signature"` to the server's message catalog (search for an existing key like in `server-team` locale/messages JSON used by `DrumeeCache.message`; mirror its location/format). If unsure of the file, grep: `grep -rn "WEBHOOK_ERROR\|bad_request" /Volumes/Data/drumee/server-team/locale 2>/dev/null` and add alongside sibling keys.

- [ ] **Step 2: Write the webhook**

```js
// service/public/stripe_webhook.js
const { Entity } = require('@drumee/server-core');
const { stripeClient, endpointSecret } = require('../lib/stripe');

class __public_stripe_webhook extends Entity {
  async receive() {
    const stripe = stripeClient();
    const secret = endpointSecret();                 // NEVER console.log this
    const raw = this.input.rawString();              // STRING form — not this.input.raw() (an array)
    const sig = (this.input.headers() || {})['stripe-signature'];
    let event;
    try {
      event = stripe.webhooks.constructEvent(raw, sig, secret);
    } catch (err) {
      return this.exception.bad_request('_webhook_signature_invalid'); // HTTP 400, blocking
    }
    // Idempotency: UNIQUE(event_id). seen.duplicate==1 => already handled.
    const seen = await this.yp.await_proc('stripe_event_seen', event.id, event.type);
    if (seen && Number(seen.duplicate) === 1) {
      return this.output.data({ ok: 1, duplicate: 1 });
    }
    const obj = event.data.object || {};
    const md = obj.metadata || {};
    try {
      switch (event.type) {
        case 'checkout.session.completed':
        case 'customer.subscription.created':
        case 'customer.subscription.updated': {
          const entity_id = md.entity_id;
          const plan = md.plan || 'pro';
          const period_end = obj.current_period_end || null;
          if (entity_id) {
            await this.yp.await_proc('payment_apply_entitlement', entity_id, plan, period_end);
            await this.notify_user(entity_id, { service: 'payment.plan_updated', plan, status: 'active' });
          }
          break;
        }
        case 'customer.subscription.deleted': {
          const entity_id = md.entity_id;
          if (entity_id) {
            await this.yp.await_proc('payment_apply_entitlement', entity_id, 'free', null);
            await this.notify_user(entity_id, { service: 'payment.plan_updated', plan: 'free', status: 'canceled' });
          }
          break;
        }
        default:
          break; // unhandled types are acknowledged (already deduped)
      }
    } catch (e) {
      this.error(`stripe reducer failed for ${event.id}: ${e.message}`); // message only, no secrets
    }
    await this.yp.await_proc('stripe_event_processed', event.id);
    this.output.data({ ok: 1 });
  }
}

module.exports = __public_stripe_webhook;
```

- [ ] **Step 3: Verify (TB-CHECK)**

```bash
node --check /Volumes/Data/drumee/server-team/service/public/stripe_webhook.js
```
Expected: exit 0. (Functional verify is Task E3 via TB-WEBHOOK after ACL + restart.)

- [ ] **Step 4: Commit**

```bash
git -C /Volumes/Data/drumee/server-team add service/public/stripe_webhook.js locale
git -C /Volumes/Data/drumee/server-team commit -m "feat(payment): secure idempotent stripe webhook (verify->400, reducer->entitlement+WS)"
```

### Task C4: Register ACL + routes (`acl/payment.json`)

**Files:**
- Create: `acl/payment.json`

- [ ] **Step 1: Write the ACL (auto-wires `SERVICE.payment.*` to FE via getServices())**

```json
{
  "services": {
    "catalog":             { "scope": "hub", "permission": { "src": "owner" }, "params": {} },
    "checkout":            { "scope": "hub", "permission": { "src": "owner" }, "params": { "period": { "type": "string", "required": true }, "plan": { "type": "string", "required": false }, "seats": { "type": "integer", "required": false, "default": 1 } } },
    "subscription_status": { "scope": "hub", "permission": { "src": "owner" }, "params": {} },
    "portal":              { "scope": "hub", "permission": { "src": "owner" }, "params": {} },
    "webhook":             { "scope": "hub", "permission": { "src": "read", "fast_check": "public-api" }, "method": "receive", "params": { "stripe-signature": { "type": "string", "required": true }, "raw_body": { "type": "string", "required": true } }, "errors": [{ "code": "WEBHOOK_ERROR", "http_status": 400 }] }
  },
  "modules": { "private": "service/private/payment", "public": "service/public/stripe_webhook" }
}
```

- [ ] **Step 2: Verify JSON + restart (TB-SRV-RESTART)**

```bash
node -e "JSON.parse(require('fs').readFileSync('/Volumes/Data/drumee/server-team/acl/payment.json','utf8')); console.log('json ok')"
# deploy server (npm run dev rsync) then:
ssh drumee.in 'sudo drumee restart vudangnt/service'
```
Expected: `json ok`; after restart the FE has `Platform.get('services').payment.catalog === 'payment.catalog'` (verified in Task E2), and `POST …?service=payment.webhook` reaches `receive()`.

- [ ] **Step 3: Commit**

```bash
git -C /Volumes/Data/drumee/server-team add acl/payment.json
git -C /Volumes/Data/drumee/server-team commit -m "feat(payment): acl/payment.json — private payment services + public webhook"
```

### Task C5: Upgrade Stripe SDK + pin apiVersion

**Files:**
- Modify: `package.json` (the `"stripe"` dep)
- Modify: `service/lib/stripe.js` (`API_VERSION` to the bundled version)

- [ ] **Step 1: Confirm the current Stripe SDK major + bundled apiVersion before pinning** (use context7/npm at impl time): the latest `stripe` Node major. Then:

```bash
# in server-team:
npm install stripe@latest
node -e "console.log('sdk', require('stripe/package.json').version)"
node -e "const S=require('stripe'); const c=new S('sk_test_x'); console.log('apiVersion', c.getApiField ? c.getApiField('version') : 'see docs');"
```

- [ ] **Step 2: Set `API_VERSION` in `service/lib/stripe.js`** to the value the installed SDK reports (replace the placeholder `'2025-04-30.basil'`).

- [ ] **Step 3: Audit removed APIs** — none of the P1 code uses them (P1 deliberately avoids `invoices.retrieveUpcoming` and `subscriptions.del`; those were only in the deleted `subscription.js`). Confirm: `grep -rn "retrieveUpcoming\|subscriptions.del\b" /Volumes/Data/drumee/server-team/service` → expect ZERO (after Task C6 deletes the old files).

- [ ] **Step 4: Verify (TB-CHECK + restart)**

```bash
node --check /Volumes/Data/drumee/server-team/service/private/payment.js /Volumes/Data/drumee/server-team/service/public/stripe_webhook.js /Volumes/Data/drumee/server-team/service/lib/stripe.js
ssh drumee.in 'sudo drumee restart vudangnt/service'
```

- [ ] **Step 5: Commit**

```bash
git -C /Volumes/Data/drumee/server-team add package.json package-lock.json service/lib/stripe.js
git -C /Volumes/Data/drumee/server-team commit -m "chore(payment): upgrade stripe SDK + pin apiVersion"
```

### Task C6: Delete dead/duplicate server code

**Files:**
- Delete: `service/private/subscription.js`, `acl/subscription.json`
- Modify: `service/callback.js` (remove the `stripe()` webhook method + all secret `console.log`s; KEEP `check_out_success`/`check_out_cancel` redirects)
- Modify: `acl/callback.json` (remove the `stripe` service entry; keep `check_out_success`/`check_out_cancel`)

- [ ] **Step 1: Grep-verify nothing else references the old namespace** before deleting:

```bash
grep -rn "service/private/subscription\|subscription\." /Volumes/Data/drumee/server-team/acl
grep -rn "retrieveUpcoming\|update_clock\|schedule(" /Volumes/Data/drumee/server-team/service
```

- [ ] **Step 2: Edit `service/callback.js`** — delete the entire `async stripe() { … }` method and every `console.log('----------Iamin…', Cache.getSysConf('stripe_skey'/'stripe_endpointSecret'))`. Keep `check_out_success`/`check_out_cancel`. Then **edit `acl/callback.json`** to remove the `"stripe"` service block (keep the two return routes).

- [ ] **Step 3: Delete the dead files**

```bash
git -C /Volumes/Data/drumee/server-team rm service/private/subscription.js acl/subscription.json
```

- [ ] **Step 4: Verify (TB-CHECK + grep zero + restart)**

```bash
node --check /Volumes/Data/drumee/server-team/service/callback.js
grep -rn "stripe_skey\|stripe_endpointSecret" /Volumes/Data/drumee/server-team/service | grep -i "console.log"   # expect ZERO
node -e "JSON.parse(require('fs').readFileSync('/Volumes/Data/drumee/server-team/acl/callback.json','utf8'))"
ssh drumee.in 'sudo drumee restart vudangnt/service'
```
Expected: no secret console.logs remain; callback.js still has the two return methods.

- [ ] **Step 5: Commit**

```bash
git -C /Volumes/Data/drumee/server-team add -A service acl
git -C /Volumes/Data/drumee/server-team commit -m "refactor(payment): delete subscription.* namespace + old webhook + secret logging"
```

---

## Group D — Frontend (ui-team)

All paths under `/Volumes/Data/drumee/ui-team/`. Verify with TB-CHECK; functional verify via TB-SMOKE in Group E.

### Task D1: Make `SERVICE.payment.*` resolvable on the FE

**Files:**
- Modify: `src/drumee/lex/services.json`

- [ ] **Step 1:** The server now auto-emits `payment.*` via `Platform.get('services')`, but add a local `payment` block too (defensive; `SERVICE` is `merge(lex/services.json, Platform.services)` and a missing key renders blank silently):

```json
"payment": { "catalog": "payment.catalog", "checkout": "payment.checkout", "subscription_status": "payment.subscription_status", "portal": "payment.portal" }
```
(Insert as a top-level key alongside the existing namespaces, matching the file's `{ "ns": { "method": "ns.method" } }` shape.)

- [ ] **Step 2: Verify (TB-CHECK as JSON)**

```bash
node -e "JSON.parse(require('fs').readFileSync('/Volumes/Data/drumee/ui-team/src/drumee/lex/services.json','utf8')); console.log('ok')"
```

- [ ] **Step 3: Commit**

```bash
git -C /Volumes/Data/drumee/ui-team add src/drumee/lex/services.json
git -C /Volumes/Data/drumee/ui-team commit -m "feat(payment): register SERVICE.payment.* on FE"
```

### Task D2: Fetch the catalog in `settings_billing`; make pricing display-only

**Files:**
- Modify: `src/drumee/builtins/widget/settings/account/billing/index.js` (`onDomRefresh`/`fetchPlanData` ~99-152, `calculateCheckoutSummary` ~311-392)
- Modify: `src/drumee/builtins/widget/settings/account/billing/skeleton/checkout.js` (bundle/price display strings ~268-310)

- [ ] **Step 1:** Load the catalog before rendering and feed `calculateCheckoutSummary` from it (remove the hardcoded `planPrices`/`bundlePrices` literals). The summary stays **display-only** — the server checkout endpoint is the price source of truth.

```js
// billing/index.js — load catalog first
async onDomRefresh() {
  this._catalog = await this.fetchService(SERVICE.payment.catalog, { hub_id: Visitor.id }).catch(() => null);
  // shape: { plans: [ { plan_code, period, currency, stripe_price_id, quota, ... } ] }
  return this.fetchPlanData();
}
```
In `calculateCheckoutSummary()`, replace the `planPrices`/`bundlePrices` constants with lookups derived from `this._catalog` (read `quota.$.disk` for storage display; the per-plan price text comes from the server catalog when present, else a neutral placeholder — it is NOT used to compute the charge). Drive `checkout.js` bundle items from `this._catalog` rather than `'$8 /mo'` literals.

- [ ] **Step 2: Verify (TB-CHECK)**

```bash
node --check /Volumes/Data/drumee/ui-team/src/drumee/builtins/widget/settings/account/billing/index.js
node --check /Volumes/Data/drumee/ui-team/src/drumee/builtins/widget/settings/account/billing/skeleton/checkout.js
```

- [ ] **Step 3: Commit**

```bash
git -C /Volumes/Data/drumee/ui-team add src/drumee/builtins/widget/settings/account/billing
git -C /Volumes/Data/drumee/ui-team commit -m "feat(payment): settings_billing fetches server catalog (prices display-only)"
```

### Task D3: Replace leaky `Wm.on('ws:event')` with `bindEvent(_a.live)` / `onWsMessage`

**Files:**
- Modify: `src/drumee/builtins/widget/settings/account/billing/index.js` (initialize ~9-43, delete `_setupPaymentWebSocket`/`_handlePaymentWebSocket`/`_handlePaymentStatus` ~42-73)

- [ ] **Step 1:** Mirror the clean `export-data` sibling:

```js
initialize(opt) {
  require('./skin');
  super.initialize(opt);
  this.model.set({ hub_id: Visitor.id, flow: 'g' });
  // ...existing state init (this.storage/this.seats/this.tab)...
  this.declareHandlers();
  this.bindEvent(_a.live);
}
onBeforeDestroy() {
  this.unbindEvent(_a.live);
}
onWsMessage(service, data, options = {}) {
  switch (service) {                       // FIRST arg, never options.service
    case 'payment.plan_updated':
      Visitor.respawn(data);
      this.triggerHandlers({ service: 'plan_updated' });
      break;
    default:
      if (super.onWsMessage) super.onWsMessage(service, data, options);
  }
}
// DELETE _setupPaymentWebSocket(), _handlePaymentWebSocket(), _handlePaymentStatus()
```

- [ ] **Step 2: Verify (TB-CHECK)**

```bash
node --check /Volumes/Data/drumee/ui-team/src/drumee/builtins/widget/settings/account/billing/index.js
grep -n "Wm.on('ws:event')\|_setupPaymentWebSocket" /Volumes/Data/drumee/ui-team/src/drumee/builtins/widget/settings/account/billing/index.js   # expect ZERO
```

- [ ] **Step 3: Commit**

```bash
git -C /Volumes/Data/drumee/ui-team add src/drumee/builtins/widget/settings/account/billing/index.js
git -C /Volumes/Data/drumee/ui-team commit -m "fix(payment): settings_billing uses bindEvent/onWsMessage (no WS leak)"
```

### Task D4: Full-page redirect launch; delete the payment overlay

**Files:**
- Modify: `src/drumee/builtins/widget/settings/account/billing/index.js` (`_proceedToCheckout` ~398-437)
- Modify: `src/drumee/builtins/widget/settings/account/index.js` (remove `proceed-to-payment`/`open-payment-link` cases ~448-465, `_openLink` ~374-385)
- Delete: `src/drumee/builtins/widget/settings/account/skeleton/payment.js`

- [ ] **Step 1:** Redirect on the checkout response (no overlay, no popup):

```js
// billing/index.js _proceedToCheckout
this.postService(SERVICE.payment.checkout, { payment })
  .then(({ url }) => { if (url) window.location.assign(url); })
  .catch(() => Wm.alert(LOCALE.SOMETHING_WENT_WRONG));
```
In `settings/account/index.js` remove the `'proceed-to-payment'` and `'open-payment-link'` `onUiEvent` cases and the `_openLink` method. Keep `_onPlanChanged()` (now driven by the WS `plan_updated` path). Delete `skeleton/payment.js`.

- [ ] **Step 2: Verify (TB-CHECK + grep)**

```bash
node --check /Volumes/Data/drumee/ui-team/src/drumee/builtins/widget/settings/account/billing/index.js /Volumes/Data/drumee/ui-team/src/drumee/builtins/widget/settings/account/index.js
grep -rn "open-payment-link\|skeleton/payment'" /Volumes/Data/drumee/ui-team/src/drumee/builtins/widget/settings/account   # expect ZERO
```

- [ ] **Step 3: Commit**

```bash
git -C /Volumes/Data/drumee/ui-team add -A src/drumee/builtins/widget/settings/account
git -C /Volumes/Data/drumee/ui-team commit -m "feat(payment): full-page redirect checkout (drop popup + overlay)"
```

### Task D5: Re-route the "Upgrade plan" affordance to `settings_billing`

**Files:**
- Modify: `src/drumee/modules/desk/wm/index.js` (`upgradePlage` ~696-700, case `'upgrade-plan'` ~1730-1731)

- [ ] **Step 1:** Confirm the account-window kind + how it opens a tab. Grep:

```bash
grep -rn "window_account\|account_profile\|load_page\|currentTab" /Volumes/Data/drumee/ui-team/src/drumee/builtins/window/account/index.js /Volumes/Data/drumee/ui-team/src/drumee/builtins/widget/settings/account/index.js | head
```
Then replace `upgradePlage()` (which feeds the dead `settings_pricing`) so the `'upgrade-plan'` case opens the account window on the Billing tab (settings_account tab index 1):

```js
case 'upgrade-plan':
  return this.launch({ kind: '<account_window_kind>', page: 1 }, { explicit: 1, singleton: 1 });
// delete upgradePlage()  (the typo'd method)
```
(Use the real account-window kind found above; `page:1` = billing tab per `settings_account.skeletons[1]`.)

- [ ] **Step 2: Verify (TB-CHECK + grep)**

```bash
node --check /Volumes/Data/drumee/ui-team/src/drumee/modules/desk/wm/index.js
grep -n "upgradePlage\|settings_pricing" /Volumes/Data/drumee/ui-team/src/drumee/modules/desk/wm/index.js   # expect ZERO
```

- [ ] **Step 3: Commit**

```bash
git -C /Volumes/Data/drumee/ui-team add src/drumee/modules/desk/wm/index.js
git -C /Volumes/Data/drumee/ui-team commit -m "fix(payment): route 'Upgrade plan' to settings_billing (kill upgradePlage typo)"
```

### Task D6: Delete dead payment UIs + desk return path

**Files:**
- Delete: `src/drumee/builtins/widget/settings/pricing/` (whole dir)
- Delete: `src/drumee/builtins/window/account/subscription/` (whole dir)
- Modify: `src/drumee/modules/desk/index.js` (remove `checkForPaymentInfo`/`checkForPaymentStatus`/`showPaymentStatus` ~715-763)
- Delete: `src/drumee/modules/desk/skeleton/payment/status-info.js`, `src/drumee/modules/desk/skin/payment/status-info.scss`; Modify `src/drumee/modules/desk/skin/index.scss` (remove the `@include` at ~line 8)

- [ ] **Step 1: Grep-verify zero references BEFORE deleting**

```bash
grep -rn "settings_pricing" /Volumes/Data/drumee/ui-team/src        # only wm/index.js (already removed in D5)
grep -rn "window/account/subscription\|account_subscription" /Volumes/Data/drumee/ui-team/src   # expect none in seeds.js
grep -rn "checkForPaymentInfo\|checkForPaymentStatus\|showPaymentStatus\|status-info" /Volumes/Data/drumee/ui-team/src
grep -rn "SERVICE.subscription" /Volumes/Data/drumee/ui-team/src    # expect ZERO after deletes
```

- [ ] **Step 2: Delete + edit**

```bash
git -C /Volumes/Data/drumee/ui-team rm -r src/drumee/builtins/widget/settings/pricing src/drumee/builtins/window/account/subscription src/drumee/modules/desk/skeleton/payment/status-info.js src/drumee/modules/desk/skin/payment/status-info.scss
```
Then remove the 3 methods from `desk/index.js` and the `@include` line from `desk/skin/index.scss`. Remove any `settings_pricing`/subscription entries from `src/drumee/seeds.js` if present (research: neither is in seeds.js — verify).

- [ ] **Step 3: Verify (TB-CHECK + build)**

```bash
node --check /Volumes/Data/drumee/ui-team/src/drumee/modules/desk/index.js
grep -rn "settings_pricing\|account_subscription\|checkForPaymentInfo\|SERVICE.subscription" /Volumes/Data/drumee/ui-team/src   # expect ZERO
```
(Full build check happens in Group E via `npm run dev`.)

- [ ] **Step 4: Commit**

```bash
git -C /Volumes/Data/drumee/ui-team add -A src/drumee
git -C /Volumes/Data/drumee/ui-team commit -m "refactor(payment): delete dead pricing/subscription UIs + desk return path"
```

---

## Group E — Wire the seed data + end-to-end smoke

### Task E1: Create Stripe TEST Products/Prices + set `stripe_price_id` in `yp.plan`

**Files:** none (Stripe Dashboard + a DB data step).

- [ ] **Step 1:** In Stripe **TEST** mode, create a Product "Drumee Pro" with two recurring Prices in **EUR**: monthly + yearly. Copy the two `price_…` ids.
- [ ] **Step 2:** Set them on the catalog (data step, NOT in the manifest seed so a manifest re-run doesn't clobber real ids):

```bash
ssh drumee.in 'echo "UPDATE yp.plan SET stripe_price_id=\"price_MONTHLY_TEST\", stripe_product_id=\"prod_TEST\" WHERE plan_code=\"pro\" AND period=\"month\" AND currency=\"eur\"; UPDATE yp.plan SET stripe_price_id=\"price_YEARLY_TEST\", stripe_product_id=\"prod_TEST\" WHERE plan_code=\"pro\" AND period=\"year\" AND currency=\"eur\";" | sudo mysql'
ssh drumee.in 'echo "SELECT plan_code,period,stripe_price_id FROM yp.plan" | sudo mysql -t'
```
- [ ] **Step 3:** Ensure `sys_conf` has `stripe_skey` (test secret key), `stripe_endpointSecret` (the test webhook signing secret), and `stripe_mode='test'`. Register a Stripe TEST webhook endpoint → `https://drumee.in/-/vudangnt/svc/?service=payment.webhook` (events: `checkout.session.completed`, `customer.subscription.created/updated/deleted`).

### Task E2: Deploy FE + verify wiring (TB-SMOKE)

- [ ] **Step 1:** `cd /Volumes/Data/drumee/ui-team && npm run dev` (wait for webpack + rsync), then **mandatory** restart:

```bash
ssh drumee.in 'sudo drumee restart vudangnt/service'
```
- [ ] **Step 2:** Sign in (test account), open **Account → Billing Information**, and in the browser console verify wiring:

```js
SERVICE.payment.catalog          // 'payment.catalog' (not undefined)
Kind.get('settings_billing')     // not null
```
Expected: catalog renders priced plans from the server; no raw `LOCALE.*` keys (if raw keys show, the endpoint restart was skipped).

### Task E3: Webhook verify + idempotency (TB-WEBHOOK)

- [ ] **Step 1:** Valid signed event → 200 + entitlement + WS (use the crafted-POST recipe in the Toolbox with `entity_id=181ffe62181ffe67`, `WHSEC=<stripe_endpointSecret>`). Then:

```bash
ssh drumee.in 'echo "SELECT event_id,type,processed_at FROM yp.stripe_event ORDER BY received_at DESC LIMIT 3" | sudo mysql -t'
ssh drumee.in 'echo "SELECT plan,source FROM yp.quota WHERE payer_id=\"181ffe62181ffe67\"" | sudo mysql -t'
ssh drumee.in 'sudo drumee log vudangnt/service | grep -i stripe'   # confirm NO secret printed
```
Expected: 200; one `stripe_event` row with `processed_at`; `yp.quota` shows `pro/stripe`; logs contain no `sk_`/`whsec_`.
- [ ] **Step 2:** Tamper one payload byte → resend → **HTTP 400**.
- [ ] **Step 3:** Replay the SAME `event_id` → response `{duplicate:1}`, no second quota change, no duplicate `stripe_event` row.

### Task E4: Full Free→Pro happy path (TB-SMOKE)

- [ ] **Step 1:** Reset the test payer to free: `ssh drumee.in 'echo "CALL yp.payment_apply_entitlement(\"181ffe62181ffe67\",\"free\",NULL)" | sudo mysql'`.
- [ ] **Step 2:** In the app: Billing → upgrade to Pro (month) → the whole tab **redirects** to Stripe hosted Checkout (no popup) → pay with `4242 4242 4242 4242` → returns to the app → WS `payment.plan_updated` → `Visitor.respawn` → UI shows **Pro without a manual refresh**.
- [ ] **Step 3:** Confirm enforcement rose:

```bash
ssh drumee.in 'echo "CALL yp.disk_limit(\"181ffe62181ffe67\")" | sudo mysql -t'   # available_disk now pro-based (50GB)
```
Expected: the upload gate reflects the paid plan — the central P1 success criterion.

---

## Self-Review

**Spec coverage** (each spec §3 decision / §5 component → task):
- Hosted Checkout + full-page redirect + one namespace → C2 (checkout), D4 (redirect), D1 (SERVICE.payment.*), C6/D6 (delete `subscription.*`). ✓
- Catalog = Stripe + `stripe_price_id` registry → B1 (yp.plan), B5 (catalog/plan procs), C2 (price_id lookup), D2 (display-only). ✓
- Billing entity (individual P1; org deferred to P3) → C2 metadata `entity_type:'user'`, B4 cascade. ✓
- One entitlement store wired to enforcement → B4 (yp.quota upsert), B7/B8/B9 (disk_limit/disk_free/my_disk_limit read yp.quota). ✓
- Webhook verify→400 + idempotency + reducer + no secret logging → C1 (no logging), C3 (verify/idempotency/reducer), B2 (stripe_event). ✓
- SDK upgrade + apiVersion + mode → C5, C1. ✓
- Cleanup (spec §8) → C6 (server), D6 (FE). ✓
- Currency EUR → B1/B5 default 'eur'. ✓

**Placeholder scan:** real values only, except two **intentional data placeholders** filled in Task E1 (`price_MONTHLY_TEST`/`price_YEARLY_TEST` Stripe ids — they cannot exist until created in the Stripe Dashboard) and Task C5's `API_VERSION` (pinned to whatever the upgraded SDK bundles). Both are explicitly resolved in their tasks, not left vague.

**Type/name consistency:** proc names match across DB↔server: `payment_get_catalog`, `payment_get_plan`, `payment_get_payer`, `payment_get_subscription`, `payment_apply_entitlement`, `stripe_event_seen`, `stripe_event_processed`. WS service string `'payment.plan_updated'` matches server `notify_user` (C3) ↔ FE `onWsMessage` case (D3). ACL `webhook.method:'receive'` matches the webhook class method (C3). `_a.live` WS subscription matches the `export-data` sibling pattern.

**Scope:** P1 only (individual Free→Pro). Org/seats (P3), multi-tier/Billing-Portal (P2), dunning (P5) are explicitly out — `portal()` is a stub, `payment_get_catalog` already returns multi-row so P2 is additive.
