# Billing & Subscription — Plan Upgrade / Downgrade + Storage Logic

> Team reference — state of the billing system after the Stripe rebuild
> (feature branches `feat/plan-domain-privileges` — PRs: schemas #67, server-team #97, ui-team #313).
> Last updated: 2026-07-17.

---

## 1. Sources of truth (4 layers)

| Layer | Role | Notes |
|-------|------|-------|
| **Stripe** | Payment truth: Checkout, Subscription, Invoice, prices | `yp.plan.stripe_price_id` is only a registry mapping plan → price; FE display prices come from `payment.catalog` (Stripe truth) |
| **`yp.subscription` (mirror)** | Copy of the subscription state for the UI | Written by the webhook (`subscription_update` / `subscription_remove`); feeds the renews/ends banner, the Settings card, the Portal button |
| **`yp.quota` (entitlement)** | Actual rights: plan, disk, seats | `UNIQUE(domain_id, payer_id)`; an org's row has `payer_id = organisation.id`; this is what **enforcement** reads |
| **`Visitor.quota()`** | FE session env | Built by the `get_quota` **FUNCTION** at bootstrap; refreshed in realtime via WS `payment.plan_updated` → `Visitor.respawn()` |

**Canonical chain for every plan change:**

```
FE checkout/portal → Stripe → webhook (signature verify + idempotency via yp.stripe_event)
  → mirror (subscription_update)
  → entitlement (payment_apply_entitlement → yp.quota)
  → notify_user (WS payment.plan_updated) → FE refreshes itself
```

If the webhook fails → it returns HTTP 500 + `stripe_event_delete`, so Stripe **retries** (no event is lost).

---

## 2. UPGRADE paths

### 2.1 Free → Pro (individual)

- Checkout with `entity_type:'user'`, metadata `{entity_type, entity_id: uid, plan, period}`.
- Webhook → mirror + `payment_apply_entitlement(uid, 'pro', …)` → quota row keyed to the uid.
- **Domain does NOT change** (the user stays on domain 1 / app.drumee.com).
- Pro per-seat: the plan includes 5 seats; seat 6+ becomes a `pro_seat` line item (€5/seat/month) — the server computes `extra = seats - included`.

### 2.2 Free/Pro → Team (org bootstrap) — new flow, 2026-07

1. FE: selecting Team shows the **Organization URL** section (org name + subdomain) when `Visitor.domain_id <= 1`.
2. FE validates **before** redirecting: `payment.validate_org_ident` (DNS-label regex, ident/vhost/domain collisions, user already in another domain → `ALREADY_IN_OTHER_DOMAIN`).
3. Checkout metadata additionally carries `payer_id`, `org_ident`, `org_name` (the org does not exist yet → the Stripe customer is temporarily keyed to the payer).
4. The webhook (on every org event, including an early `invoice.paid`) → `_resolveOrgEntity` → the **`org_provision`** proc (transactional + **idempotent** — `organisation.owner_id UNIQUE`):
   - Creates the new `domain` + `organisation` + `vhost` + the org hub;
   - `domain_grant(domain_id, 63, payer_id)` → **the payer becomes dom_owner** (yp.privilege, move semantics: one domain per user);
   - **Migrates the payer's personal hubs** into the org domain (hub.domain_id, entity.dom_id, vhost fqdn rewrite);
   - Re-keys the payer's domain-1 quota row to the new domain.
5. The entitlement is applied to the **ORG entity**: disk = 50GB × seats.
6. FE receives WS `payment.org_provisioned` → notification + reload → the browser lands on the new org vhost (`<ident>.<main_domain>`).

### 2.3 Team — adding seats / buying storage

- A new checkout on the existing org (the server resolves the org via `payment_get_org(uid)` — no need to re-enter the subdomain).
- `seats` = Stripe quantity on the team line item; `bundle` = `storage_100 | storage_500 | storage_1000` becomes a second add-on line item.
- The webhook's `_itemsEntitlement` classifies base vs add-on items (via `payment_get_addon(price_id)`) → quota = 50GB × seats + extra_disk.

### 2.4 Enterprise

- **"Contact sales"** (contact@drumee.org) — no self-serve checkout, no `yp.plan` row.

### 2.5 Already subscribed — changing cycle / card / viewing invoices

- Via the **Stripe Billing Portal** ("Manage billing" in the Billing page footer — a hyperlink): Stripe handles proration; the mirror re-syncs via the `customer.subscription.updated` webhook.

---

## 3. DOWNGRADE / CANCEL paths

### 3.1 Cancel (in-app or Portal)

- `cancel_at_period_end = true`. Stripe status stays `active`; **the mirror records `canceled`**.
- **The entitlement is KEPT until period end** — the user keeps their current plan.
- FE: the banner flips to "Your plan ends on {date}" + a **Resume Subscription** button.
- The confirm modal before cancelling lists the consequences: keep the plan until {date} → back to Free 20GB; a warning if usage exceeds 20GB; a seats-loss warning — **only when `entity_type === 'org'`** (the `organization` flag in quota is 1 even for personal Pro, so that flag must not drive it).

### 3.2 Resume (before period end)

- `cancel_at_period_end = false` → the mirror goes back to `active`.
- **Confirmation popup** (Figma 3050-96691): green check + "Resume Subscription" + a Done button.
- **Confirmation email** (Figma 3050-96856): the webhook detects `previous_attributes.cancel_at_period_end: true → false` (covers both in-app and Portal resumes) → sends the receipt-shell email "Your Drumee {Plan} plan is resumed" with the latest invoice attached (a resume issues no new invoice).

### 3.3 Period end — hard downgrade (`customer.subscription.deleted`)

- The mirror row is removed (`subscription_remove`) → the banner disappears.
- **User**: entitlement drops to Free (20GB).
- **Org**: `payment_clear_entitlement` **DELETES** the org's quota row → every member falls back to per-user Free. (Never apply a 'free' plan to an org — it would compute disk 0 and lock out the whole team.) On re-subscribe, `payment_apply_entitlement` reseeds `quota_usage` from live usage (the FK cascade wiped the counter cache).

### 3.4 No direct Team → Pro downgrade

- The user must **cancel** (back to Free at period end) and then buy Pro, or act inside the Billing Portal.
- An in-app plan-change flow with proration would be a new feature — it does not exist yet.

### 3.5 Dunning (failed payments)

- `invoice.payment_failed` → WS notify `past_due` (grace period, entitlement kept).
- After Stripe exhausts retries → `subscription.deleted` → downgrade as in 3.3.

---

## 4. Storage manager — quota write/read

### Write (entitlement)

`payment_apply_entitlement(entity_id, plan, period_end, entity_type, seat_total, extra_disk)`:

| entity_type | disk |
|-------------|------|
| `user` | the plan's disk + extra_disk (storage bundle) |
| `org`  | 50GB × seat_total + extra_disk |

### Read (upload enforcement + display)

**Tenant-first** cascade — the same logic in `disk_limit`, `my_disk_limit`, and `get_quota`
(⚠️ the `get_quota.sql` file contains **both a PROCEDURE and a FUNCTION** — the FUNCTION is what builds the session env, so both must be kept in sync):

```
1. domain_id > 1 → the ORG's row (JOIN organisation: o.domain_id = q.domain_id AND o.id = q.payer_id)
2. → the personal row keyed by payer_id
3. → legacy drumate.profile.quota
4. → the default Free row ('ffffffffffffffff', 20GB)
```

→ Every org member shares the domain quota; individual users keep their own; the org row wins when the payer holds both a personal and an org subscription.

---

## 5. FE — display surfaces

| Surface | Source | Behavior |
|---------|--------|----------|
| Sidebar plan badge | `Visitor.quota().plan` | "Team Plan" / "Pro Plan"… |
| Billing page — plans | `Visitor.quota()` + `payment.catalog` | The current plan's card is **focused** (primary border + tinted header, "Your current plan" pill); Pro's "Popular" highlight is **suppressed** when the user is on Team/Enterprise |
| Subscription banner | `payment.subscription_status` (org-first) | active → "renews on {date}" + Cancel plan; pending cancel → "ends on {date}" + Resume |
| Settings card | `payment.subscription_status` | Status line + Manage subscription |
| Realtime | WS `payment.plan_updated` / `payment.org_provisioned` | refetch + re-render; a visibilitychange refetch covers returning from the Portal |
| "Manage billing" (Billing footer) | `payment.portal` | Hyperlink → Stripe Billing Portal |

---

## 6. Known gaps / remaining work

1. **A payer holding both personal Pro + org Team** → double billing (the server reads org-first so the UI is correct, but Stripe still charges both). The personal sub should be superseded/cancelled on Team upgrade.
2. The feature branch lacks the `_hasPaidSub → open Portal instead of a new checkout` guard (the `test` branch has it) — to be reconciled at PR merge.
3. **The period-end hard downgrade has not been observed live** (requires waiting for period end, or a Stripe API key to force `subscription.deleted`).
4. Enterprise has no defined pricing/flow (Contact sales only).
5. After confirming a cancel, the app shows a full-screen Butler info dialog that requires a Close click — consider switching it to an auto-hiding toast.

---

## Appendix — file map

| Layer | File |
|-------|------|
| FE billing widget | `ui-team/src/drumee/builtins/widget/settings/account/billing/` (index.js, skeleton/{index,plans,checkout,footer}.js, result/) |
| FE result/resume modal | `…/billing/result/` (`settings_billing_result`, variant `result:'resume'`) |
| Server payment services | `server-team/service/private/payment.js` (checkout, portal, cancel/resume, subscription_status, validate_org_ident) |
| Server webhook | `server-team/service/public/stripe_webhook.js` (mirror, entitlement, org provisioning, receipt/resume emails) |
| Email template | `server-team/service/private/templates/butler/payment-receipt.html` (`heading`/`intro` params) |
| Key procs | `schemas/yellow_page/procedures/…`: `org_provision`, `payment_apply_entitlement`, `payment_clear_entitlement`, `payment_get_org/plan/payer/subscription`, `subscription_update/remove`, `get_quota`/`disk_limit`/`my_disk_limit` (cascade), `stripe_event_seen/delete` |
