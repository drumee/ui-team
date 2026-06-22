# Stripe Payment — Full Rebuild Design

- **Date:** 2026-06-22
- **Branch:** `feature/stripe-payment` (ui-team + server-team)
- **Status:** Design — approved in brainstorming, pending written-spec review
- **Repos:** `ui-team` (FE), `server-team` (services), `schemas` (DB procs/tables)

---

## 1. Purpose & context

The current Stripe integration's **architecture is correct** (hosted Checkout → webhook → quota) but almost every **implementation** of it is broken, hardcoded, duplicated, or dead. This is a **full rebuild** of the payment subsystem on top of that proven shape.

Established constraints (from brainstorming):

- **Scope:** full rebuild, delivered as ONE overarching architecture (this doc), implemented in **phases**.
- **Billing entity:** both **individual users AND orgs/teams** (seats). Stripe Customer = user *or* org; entitlement cascades **payer → org/domain → free**.
- **Migration:** **none required** — no real paying customers exist (test-only). Clean rebuild; Stripe **test** data may be reset.
- **Currency (v1):** single currency — **EUR** (matches current server default). Catalog modelled so adding a currency = adding a `stripe_price_id` row, not code.

### 1.1 Why rebuild (the real pain, from investigation)

Critical (security / correctness):
1. **Webhook signature is non-blocking** — `server-team/service/public/callback.js:33-41` only `debug()`s on verify failure, then falls through to `event.data.object` on `undefined`. The endpoint that mutates money/entitlement does not actually verify Stripe.
2. **Zero idempotency** — Stripe retries re-apply quota/emails; the only dedupe is the always-true bug `WHERE entity_id = entity_id`.
3. **Credential leakage** — `console.log` prints `stripe_skey` + endpoint secret on every webhook (`callback.js:25,27`).
4. **Entitlement does not reach the gate** — payment writes `yp.quota` + `drumate.profile.quota`, but `disk_limit`/`disk_free` (the upload gate) read a *different* store. Paying may not raise the enforced limit.

Structural rot:
- 3 parallel checkout UIs, 2 SERVICE namespaces (`payment.*` vs `subscription.*`), 2 launch mechanisms (popup vs full-page redirect), 2 completion signals (WS vs query-param), 2 currencies ($ vs €).
- Primary "Upgrade plan" affordance is dead (`wm.upgradePlage` typo → unregistered `settings_pricing`).
- Prices hardcoded in FE (3 places) + computed in SQL (`*120/100`) + reconstructed per request via `stripe.*.search` (race-prone).
- Three competing entitlement stores (`yp.quota`, `drumate.profile.quota`, `group_quota`).
- Stripe SDK pinned `^9.4.0` (≈9 majors behind; uses removed APIs).

---

## 2. Principles

- **Stripe owns price & subscription-state truth.** The DB stores a mapping (`stripe_price_id`) + derived entitlement; the FE never hardcodes prices.
- **The webhook is the ONLY fulfilment path.** Redirect return is UX-only.
- **Everything idempotent.** Every webhook event is deduped and the reducer is a pure upsert to desired state.
- **One of everything:** one SERVICE namespace, one checkout launch convention, one entitlement store, one billing panel.
- **Offload to Stripe** where hosted surfaces exist (Checkout, Billing Portal) instead of rebuilding invoice/cancel/card/proration UI.

---

## 3. Core architecture (cross-cutting decisions)

| # | Decision | Choice | Rejected alt |
|---|----------|--------|--------------|
| 1 | Checkout surface & launch | **Hosted Stripe Checkout**, full-page redirect (`success_url`/`cancel_url` back into app), single `SERVICE.payment.*` namespace | Embedded Checkout / Payment Element (more control, more work) — deferred |
| 2 | Catalog / price truth | **Stripe Products/Prices = price truth**; DB `yp.plan` stores `stripe_price_id` per (plan × period × currency). FE fetches a priced catalog from `SERVICE.payment.catalog` | DB-as-truth synced to Stripe — drift risk |
| 3 | Billing entity | Stripe Customer per **user OR org(domain)**; subscription `metadata { entity_type, entity_id, plan, seats }`; **seats = `quantity`**; entitlement cascade payer → org → free | individual-only / org-only |
| 4 | Entitlement store | **One canonical store = `yp.quota`**; **fix `disk_limit`/`disk_free` to read `yp.quota`**; webhook writes only `yp.quota` (+ subscription mirror) | keep `profile.quota` (doesn't cascade to org) |
| 5 | Webhook | raw-body signature verify → **400 on fail**; idempotency via `yp.stripe_event(event_id UNIQUE)`; single **reducer** for `checkout.session.completed` + `customer.subscription.*` + `invoice.*` → idempotent entitlement upsert + WS notify; **no secret logging** | non-verifying fall-through (current) |
| 6 | SDK & config | upgrade `stripe` SDK to current + **pin `apiVersion`**; explicit **mode (test/live)** flag; keep `sys_conf` but stop logging (env/secret-manager later) | stay on v9 (uses removed APIs) |
| 7 | Currency (v1) | **EUR** only; catalog modelled for multi-currency = add price_id rows | hardcoded $/€ mix |
| 8 | Lifecycle management | **Stripe Billing Portal** (`billingPortal.sessions.create`) for invoice history, cancel/resume, card update, proration — one "Manage billing" button → redirect | rebuild custom invoice/cancel/proration UI (the current dead code) |

---

## 4. Data model

### Keep (salvage)
- `yp.subscription_new` — active-subscription mirror (`entity_id` ⇄ Stripe `customer_id`/`subscription_id`/`status`). Extend if needed.
- `get_quota` cascade read logic (payer → org/domain → free).
- `yp.renewal_history` — audit (clean up overloaded status enum).
- `sys_conf` config mechanism (+ mode flag, + apiVersion; stop logging).

### New
- **`yp.plan`** (rebuilt) — catalog + entitlement registry:
  `plan_code` (free/pro/advanced/company…), `entity_type` (user|org), `period` (month|year), `currency`, `stripe_price_id`, `stripe_product_id`, `quota` (bytes/limit), `features` JSON, `active`.
  Single source for: priced catalog, checkout price_id lookup, and the quota a plan grants.
- **`yp.stripe_event`** — idempotency log: `event_id` (UNIQUE), `type`, `received_at`, `processed_at`, optional `payload`.
- **`yp.quota`** (canonical entitlement) — `entity_id`, `plan_code`, `limit`, `source`, `period_end`. The ONE store the webhook writes and enforcement reads.

### Drop (zombie)
- `yp.subscription` (old) and `organisation_add`'s INSERT into it.
- `yp.subscription_history`, `yp.payment` (write-only), legacy commented `payment_initiate/paid/failed/get` procs.
- **Entire `licence` DB class** (commented tables, broken `packages.sql`, no Stripe fields).
- Broken `create_plan` / `create_quota` / `update_quota`; `product` markup (`*120/100`) logic; `product_get`/`plans_get` alias bugs.

---

## 5. Components & boundaries

### Frontend (`ui-team`)
- **`settings_billing`** (keep shell) = the single billing home: current plan, fetched catalog, upgrade CTA, **"Manage billing"** (→ Stripe Portal), status. Fix the WS hook to the real `onWsMessage` contract (currently `Wm.on('ws:event')`, leaks a listener).
- Fix dead "Upgrade plan" affordances (storage/apps buttons; `upgradePlage` typo) → route to `settings_billing`.
- Checkout launch helper: redirect to `session.url`.
- Return page: lightweight "processing…" state + one WS refresh (`Visitor.respawn`).
- **Delete:** `__account_subscription` window, `settings_pricing`, the desk query-param return path (`desk.checkForPaymentInfo`).

### Server (`server-team`)
- **`service/private/payment.js`** (consolidate from `subscription.js`) — one service class:
  - `catalog()` → priced catalog from `yp.plan`.
  - `checkout()` → ensure Stripe Customer (user|org) + `checkout.sessions.create({ mode:'subscription', line_items:[{price: price_id, quantity: seats}], metadata })`.
  - `portal()` → `billingPortal.sessions.create({ customer, return_url })`.
  - `subscription_status()` → current entity subscription.
- **`service/public/stripe_webhook.js`** (rebuilt `callback.stripe`):
  - raw-body `constructEvent` → **400** on failure.
  - idempotency insert into `yp.stripe_event` (skip if seen).
  - **reducer** → `payment_apply_entitlement(...)` upsert + WS `payment.plan_updated`.
- Stripe init module: SDK + `apiVersion` pin + mode + key from `sys_conf` (no logging).

### DB (`schemas`)
- Procs: `payment_get_catalog`, `payment_apply_entitlement(entity, plan, period_end)`, `payment_get_subscription`.
- **Fix `disk_limit`/`disk_free` to read `yp.quota`** (the load-bearing enforcement fix).

---

## 6. End-to-end flow (target)

1. User opens `settings_billing` → FE calls `SERVICE.payment.catalog` → renders priced plans (display-only).
2. User picks plan → FE `SERVICE.payment.checkout { plan, period, entity_type, seats }`.
3. `payment.checkout()` ensures Stripe Customer (user|org), creates a subscription Checkout Session with `price_id` from `yp.plan` and `quantity=seats`, returns `session.url`.
4. FE full-page redirects to Stripe Checkout.
5. User pays → Stripe redirects to `success_url` (a "processing…" page).
6. Stripe → `POST` webhook → verify (raw body) → 400 if invalid → dedupe via `yp.stripe_event` → reducer applies entitlement (`yp.quota` upsert + `yp.subscription_new` mirror) → WS `payment.plan_updated`.
7. FE receives WS → `Visitor.respawn` → UI reflects new plan; `disk_limit`/`disk_free` now read the raised `yp.quota`.
8. "Manage billing" → `SERVICE.payment.portal` → redirect to Stripe Billing Portal (invoices, cancel/resume, card, proration). Portal changes flow back through the same webhook reducer.

---

## 7. Phasing (one architecture, phased delivery)

- **P1 — Foundation + Core Subscription** *(the bedrock; contains the 4 critical fixes)*
  `yp.plan` + `yp.stripe_event` + `yp.quota` + fix enforcement; `payment.js` (`catalog`+`checkout`); rebuilt webhook (verify+idempotency+reducer); SDK upgrade + config + secret hygiene; individual Free→Pro checkout→entitlement; delete dead/duplicate code. **Ships a secure, correct paid flow.**
- **P2 — Catalog & lifecycle**: multi-tier + month/year in `yp.plan`; **Stripe Billing Portal** integration (invoice/cancel/proration); fix "Upgrade plan" entry points.
- **P3 — Org/Team & seats**: org as billing entity, `quantity`=seats, cascade payer→org.
- **P4 — Storage add-ons**: add-on line items (recurring) on the subscription.
- **P5 — Dunning & renewal**: `renewal_event` table, `invoice.payment_failed` handling, grace period, nightly reconcile job vs Stripe.

---

## 8. Cleanup (delete list)

- FE: `__account_subscription` window + skeletons, `settings_pricing`, desk query-param return path.
- Server: `subscription.*` duplicate namespace, `RedisStore` bare refs, `update_clock`/`schedule` (or implement+ACL), `console.log` of secrets.
- DB: `yp.subscription` (old), `subscription_history`, `payment`, legacy `payment_*` procs, `licence` class, broken `create_*`/`product_get`/`plans_get`/markup logic.

---

## 9. Success criteria

- A test user can subscribe (Free→Pro, EUR) via hosted Checkout and the **enforced** disk limit rises (verified through `disk_limit`/`disk_free`).
- Webhook **rejects** an invalid signature with 400 and **never logs secrets**.
- Replaying the same Stripe event is a no-op (idempotent).
- One billing panel, one SERVICE namespace, one launch convention; all dead/duplicate code removed.
- Catalog price changes require only a Stripe price + a `yp.plan` row — no code change.
- "Manage billing" opens the Stripe Portal; cancel/resume there reflects back via the webhook.

---

## 10. Open items (resolve during P1 planning)

- Exact plan catalog (codes, quota bytes, feature flags) and their Stripe Product/Price IDs — *data*, fill during P1.
- `yp.quota` final column shape vs reuse of existing `yp.quota` columns — confirm against current DDL.
- Where org's Stripe Customer is keyed (org admin user vs domain entity).
- Email templates (`butler/payment-*` not found in repo) — confirm sender for receipts/dunning (P5).
