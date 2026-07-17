# Billing & Subscription — Logic Upgrade / Downgrade Plan + Storage

> Tài liệu tổng hợp cho team — trạng thái hệ thống billing sau đợt rebuild Stripe
> (feature branches `feat/plan-domain-privileges` — PRs: schemas #67, server-team #97, ui-team #313).
> Cập nhật: 2026-07-17.

---

## 1. Nguồn sự thật (4 tầng)

| Tầng | Vai trò | Ghi chú |
|------|---------|---------|
| **Stripe** | Sự thật thanh toán: Checkout, Subscription, Invoice, giá | `yp.plan.stripe_price_id` chỉ là registry map plan → price; giá hiển thị FE lấy từ `payment.catalog` (Stripe truth) |
| **`yp.subscription` (mirror)** | Bản sao trạng thái subscription cho UI | Ghi bởi webhook (`subscription_update` / `subscription_remove`); nuôi banner renews/ends, Settings card, nút Portal |
| **`yp.quota` (entitlement)** | Quyền lợi thực: plan, disk, seat | `UNIQUE(domain_id, payer_id)`; row của org có `payer_id = organisation.id`; đây là thứ **enforcement** đọc |
| **`Visitor.quota()`** | Session env phía FE | Build từ **FUNCTION** `get_quota` lúc bootstrap; refresh realtime qua WS `payment.plan_updated` → `Visitor.respawn()` |

**Chuỗi chuẩn của mọi thay đổi plan:**

```
FE checkout/portal → Stripe → webhook (verify chữ ký + idempotency yp.stripe_event)
  → mirror (subscription_update)
  → entitlement (payment_apply_entitlement → yp.quota)
  → notify_user (WS payment.plan_updated) → FE tự refresh
```

Webhook lỗi → trả HTTP 500 + `stripe_event_delete` để Stripe **retry** (không mất event).

---

## 2. Các đường UPGRADE

### 2.1 Free → Pro (cá nhân)

- Checkout `entity_type:'user'`, metadata `{entity_type, entity_id: uid, plan, period}`.
- Webhook → mirror + `payment_apply_entitlement(uid, 'pro', …)` → quota row của chính uid.
- **Domain KHÔNG đổi** (user ở lại domain 1 / app.drumee.com).
- Pro per-seat: plan gồm 5 ghế; ghế thứ 6+ là line item `pro_seat` (€5/ghế/tháng) — server tự tính `extra = seats - included`.

### 2.2 Free/Pro → Team (org bootstrap) — flow mới 2026-07

1. FE: chọn Team → nếu `Visitor.domain_id <= 1` hiện section **Organization URL** (org name + subdomain).
2. FE validate **trước** khi redirect: `payment.validate_org_ident` (DNS-label regex, trùng ident/vhost/domain, user đã thuộc domain khác → `ALREADY_IN_OTHER_DOMAIN`).
3. Checkout metadata mang thêm `payer_id`, `org_ident`, `org_name` (org chưa tồn tại → Stripe customer tạm key theo payer).
4. Webhook (mọi org-event, kể cả `invoice.paid` tới sớm) → `_resolveOrgEntity` → proc **`org_provision`** (transactional + **idempotent** — `organisation.owner_id UNIQUE`):
   - Tạo `domain` mới + `organisation` + `vhost` + hub org;
   - `domain_grant(domain_id, 63, payer_id)` → **payer thành dom_owner** (yp.privilege, move-semantics: 1 user 1 domain);
   - **Migrate hub cá nhân** của payer sang domain org (hub.domain_id, entity.dom_id, vhost fqdn rewrite);
   - Re-key quota row domain-1 của payer sang domain mới.
5. Entitlement áp cho **ORG entity**: disk = 50GB × seats.
6. FE nhận WS `payment.org_provisioned` → thông báo + reload → browser landing trên vhost org mới (`<ident>.<main_domain>`).

### 2.3 Team tăng seats / mua thêm storage

- Checkout mới trên org sẵn có (server tự resolve org qua `payment_get_org(uid)` — không cần nhập lại subdomain).
- `seats` = Stripe quantity của line item team; `bundle` = `storage_100 | storage_500 | storage_1000` thành line item add-on thứ 2.
- Webhook `_itemsEntitlement` phân loại base vs add-on (qua `payment_get_addon(price_id)`) → quota = 50GB × seats + extra_disk.

### 2.4 Enterprise

- **"Contact sales"** (contact@drumee.org) — không có checkout self-serve, không có `yp.plan` row.

### 2.5 Đang có sub — đổi cycle / thẻ / xem invoice

- Qua **Stripe Billing Portal** ("Manage billing" ở footer trang Billing — hyperlink): Stripe lo proration; mirror sync lại qua webhook `customer.subscription.updated`.

---

## 3. Các đường DOWNGRADE / CANCEL

### 3.1 Cancel (in-app hoặc Portal)

- `cancel_at_period_end = true`. Stripe status vẫn `active`; **mirror ghi `canceled`**.
- **Entitlement GIỮ NGUYÊN đến hết kỳ** — user vẫn dùng plan cũ.
- FE: banner chuyển "Your plan ends on {date}" + nút **Resume Subscription**.
- Modal confirm trước khi cancel liệt kê hậu quả: giữ plan đến {date} → về Free 20GB; cảnh báo nếu usage vượt 20GB; cảnh báo mất seats — **chỉ khi `entity_type === 'org'`** (flag `organization` trong quota =1 cả với Pro cá nhân nên không dùng flag đó).

### 3.2 Resume (trước khi hết kỳ)

- `cancel_at_period_end = false` → mirror `active` lại.
- **Popup xác nhận** (Figma 3050-96691): check xanh + "Resume Subscription" + nút Done.
- **Email xác nhận** (Figma 3050-96856): webhook detect `previous_attributes.cancel_at_period_end: true → false` (bắt cả resume in-app lẫn Portal) → gửi receipt-shell email "Your Drumee {Plan} plan is resumed" kèm invoice gần nhất (resume không sinh invoice mới).

### 3.3 Hết kỳ — hard downgrade (`customer.subscription.deleted`)

- Mirror row bị xóa (`subscription_remove`) → banner biến mất.
- **User**: entitlement về Free (20GB).
- **Org**: `payment_clear_entitlement` **XÓA** quota row của org → toàn bộ member rơi về Free per-user. (Không apply plan 'free' cho org — sẽ ra disk 0 và khóa cả team.) Khi re-subscribe, `payment_apply_entitlement` reseed lại `quota_usage` từ usage thật (FK cascade đã xóa cache đếm).

### 3.4 Không có downgrade trực tiếp Team → Pro

- Phải **cancel** (về Free cuối kỳ) rồi mua Pro mới, hoặc thao tác trong Billing Portal.
- Muốn flow đổi plan in-app có proration → là feature mới, chưa có.

### 3.5 Dunning (trả tiền thất bại)

- `invoice.payment_failed` → WS notify `past_due` (grace period, entitlement giữ).
- Stripe retry hết → `subscription.deleted` → downgrade như 3.3.

---

## 4. Storage manager — quota đọc/ghi

### Ghi (entitlement)

`payment_apply_entitlement(entity_id, plan, period_end, entity_type, seat_total, extra_disk)`:

| entity_type | disk |
|-------------|------|
| `user` | disk của plan + extra_disk (storage bundle) |
| `org`  | 50GB × seat_total + extra_disk |

### Đọc (enforcement upload + hiển thị)

Cascade **tenant-first** — cùng logic trong `disk_limit`, `my_disk_limit`, và `get_quota`
(⚠️ file `get_quota.sql` chứa **cả PROCEDURE lẫn FUNCTION** — FUNCTION mới là thứ build session env → sửa phải sửa cả hai):

```
1. domain_id > 1 → row của ORG (JOIN organisation: o.domain_id = q.domain_id AND o.id = q.payer_id)
2. → row cá nhân theo payer_id
3. → legacy drumate.profile.quota
4. → row Free mặc định ('ffffffffffffffff', 20GB)
```

→ Mọi member của org hưởng chung quota domain; user cá nhân giữ quota riêng; org row thắng khi payer có cả sub cá nhân lẫn org.

---

## 5. FE — các điểm hiển thị

| Chỗ | Nguồn | Hành vi |
|-----|-------|---------|
| Sidebar plan badge | `Visitor.quota().plan` | "Team Plan" / "Pro Plan"… |
| Trang Billing — plans | `Visitor.quota()` + `payment.catalog` | Card current plan **focused** (border primary + header tinted, pill "Your current plan"); highlight "Popular" của Pro **bị tắt** khi user đang ở Team/Enterprise |
| Banner subscription | `payment.subscription_status` (org-first) | active → "renews on {date}" + Cancel plan; pending-cancel → "ends on {date}" + Resume |
| Settings card | `payment.subscription_status` | Status line + Manage subscription |
| Realtime | WS `payment.plan_updated` / `payment.org_provisioned` | refetch + re-render; visibilitychange refetch khi quay lại từ Portal |
| "Manage billing" (footer Billing) | `payment.portal` | Hyperlink → Stripe Billing Portal |

---

## 6. Gaps đã biết / việc còn lại

1. **Payer có cả Pro cá nhân + Team org** → double-billing (server đọc org-first nên UI đúng, nhưng Stripe vẫn charge cả 2). Cần supersede/cancel sub cá nhân khi lên Team.
2. Feature branch chưa có guard `_hasPaidSub → mở Portal thay vì checkout mới` (nhánh `test` đã có) — hợp nhất khi merge PR.
3. **Hard downgrade cuối kỳ chưa được chứng kiến chạy thật** (cần chờ period end hoặc Stripe API key để ép `subscription.deleted`).
4. Enterprise chưa định nghĩa pricing/flow (chỉ Contact sales).
5. Sau khi confirm cancel, app hiện Butler info dialog full-screen phải bấm Close — cân nhắc đổi thành toast tự ẩn.

---

## Phụ lục — file map

| Layer | File |
|-------|------|
| FE billing widget | `ui-team/src/drumee/builtins/widget/settings/account/billing/` (index.js, skeleton/{index,plans,checkout,footer}.js, result/) |
| FE modal result/resume | `…/billing/result/` (`settings_billing_result`, variant `result:'resume'`) |
| Server payment services | `server-team/service/private/payment.js` (checkout, portal, cancel/resume, subscription_status, validate_org_ident) |
| Server webhook | `server-team/service/public/stripe_webhook.js` (mirror, entitlement, org provision, receipt/resume email) |
| Email template | `server-team/service/private/templates/butler/payment-receipt.html` (param `heading`/`intro`) |
| Procs chính | `schemas/yellow_page/procedures/…`: `org_provision`, `payment_apply_entitlement`, `payment_clear_entitlement`, `payment_get_org/plan/payer/subscription`, `subscription_update/remove`, `get_quota`/`disk_limit`/`my_disk_limit` (cascade), `stripe_event_seen/delete` |
