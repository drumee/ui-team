# External Guest Audit Log (Admin Console — Audit tab) — Design

**Date:** 2026-07-02
**Status:** Approved (option A)
**Repos touched:** schemas, admin-api, admin-console, ui-team (locale only)

## Goal

In the admin-console `apps_main` Audit tab: temporarily hide the three bottom stat
boxes (Security Score, High-Risk Actions, Storage Activity with the "Total data
logged in last 30 days" caption) and replace that area with a real, org-wide
audit table of **external-guest activity on secure shares**.

## Decisions (user-confirmed)

1. **Scope: org-wide.** An org admin sees guest opens for shares owned by *all*
   members of their domain — not just their own shares.
2. **"External guest" = anyone who is not a member of the org.** Keep anonymous
   visitors (`actor_id IS NULL`) and logged-in Drumee users from *other*
   domains; exclude opens by the org's own members.
3. **Include public links.** Do not restrict to gated shares (`require_email` /
   `password_hash` / fixed recipient); public-link opens are the riskiest and
   must appear. A `Public`/`Protected` badge distinguishes them.
4. The 3 boxes are **hidden, not deleted** — a single flag restores them.

## Data reality (limits to display honestly)

`yp.secure_share_access_event` stores one row per guest **open/visit**:
`token_id, hub_id, node_id, recipient_email, actor_id, entered_at,
last_seen_at (, creator_seen_at)`. There is **no IP, no user-agent, no action
verb** (downloads are not logged as separate events — `media.js` download path
never writes events). So the table reports *who opened which resource, when,
and for how long* — nothing more. Guest identity = `recipient_email`
(nullable → display "Anonymous").

Org-scoping keys: `event.token_id → secure_share_token.creator_id →
drumate.domain_id` (same join style as `get_security_signals.sql`).

## Components

### 1. FE — hide the insights boxes (admin-console)

- `apps-main/index.js`: new state `this._showAuditInsights = false;` with a
  `// TEMP:` comment (same pattern as `SHOW_DEVICE_SECTION` in
  `skeleton/edit-member.js`). `_loadAuditTab()` skips `_loadAuditStats()` when
  the flag is off (saves the expensive per-hub stats fan-out).
- `skeleton/audit.js` `audit_view`: `ui._showAuditInsights ? insights(ui) : null`
  (the kids array already `.filter(Boolean)`s). All three boxes come from that
  single `insights(ui)` call — no other call sites.

### 2. FE — new "External Guest Activity" section (admin-console)

Rendered where the boxes were (bottom of the Audit tab, below the existing
audit table), in `skeleton/audit.js` (new function `guestActivity(ui)`).

- Columns: **Guest** (`recipient_email` or `LOCALE.ANONYMOUS_GUEST`) ·
  **Resource** (node name; falls back to `node_id`) · **Workspace** (hub name)
  · **Shared by** (owner fullname) · **Link** (badge `Public` / `Protected`) ·
  **Opened** (`entered_at`, formatted like the audit rows) · **Duration**
  (`last_seen_at - entered_at`, humanized; "—" when < 5s).
- Follows the tab's existing **date-range dropdown** (`_auditRangeWindow()`),
  reloads on range change alongside the audit list.
- Own pagination (20/page, `SHOWING_OF` summary) — services
  `apps-guest-prev` / `apps-guest-next`, mirroring `apps-audit-prev/next`.
- Loading / error / empty states identical in style to the audit list
  (`LOCALE.NO_GUEST_EVENTS` when empty).
- State in `index.js`: `_guestEvents, _guestEventsTotal, _guestPage,
  _guestPageSize, _guestState` + loader `_loadGuestEvents()` called from
  `_loadAuditTab()` and the range/pagination handlers.

### 3. Schema — two new yp procs (schemas repo)

`yellow_page/procedures/secure_share/secure_share_guest_events_by_domain.sql`

```
secure_share_guest_events_by_domain(_domain_id INT, _from INT, _to INT, _page INT)
```

- `FROM secure_share_access_event e JOIN secure_share_token t ON t.id = e.token_id`
- `JOIN drumate owner ON owner.id = t.creator_id AND owner.domain_id = _domain_id`
- `LEFT JOIN drumate viewer ON viewer.id = e.actor_id`
- `LEFT JOIN hub h ON h.id = t.hub_id`
- `WHERE (e.actor_id IS NULL OR viewer.domain_id IS NULL OR viewer.domain_id != _domain_id)`
  `AND (_from = 0 OR e.entered_at >= _from) AND (_to = 0 OR e.entered_at <= _to)`
- No gate filter (public links included).
- Returns: `id (e.sys_id), token_id, hub_id, node_id, recipient_email,
  actor_id, entered_at, last_seen_at,
  is_protected` (= `t.require_email=1 OR t.password_hash IS NOT NULL OR
  t.recipient_email IS NOT NULL`), `owner_name`
  (`CONCAT(owner.firstname,' ',owner.lastname)`), `workspace_name`
  (`IFNULL(h.name, h.hubname)` fallback `t.hub_id`).
- `ORDER BY e.entered_at DESC`, `LIMIT`ed via `pageToLimits`-style paging
  (20/page), following `get_org_user_storage.sql`.

`..._count.sql`: same joins/WHERE, `SELECT COUNT(*) AS total` — paired count
proc, same pattern as `get_org_user_storage_count`.

Both added to `patches/manifest.txt` + `patches/changelog.txt`. Deploy target:
`yp` (single DB — no factory stop/start).

### 4. BE — admin-api service

`service/admin.js` → `async get_guest_share_events()`:

- Guard/pattern of `get_audit_stats`: `organisation_get(this.user.domain_id())`,
  `NO_ORG` when empty; acl `scope: "domain"`, `permission { src: "admin" }`.
- Inputs: `from_time`, `to_time`, `page` (all optional; 0/1 defaults).
- Calls both procs; **enriches node names**: group the ≤20 rows by `hub_id`,
  `get_db_name(hub_id)` per distinct hub, then one
  `SELECT id, user_filename FROM <hub_db>.media WHERE id IN (...)` per hub;
  rows whose node no longer exists keep `node_id` as the display name.
- Output envelope `{ data, total, page, page_size }` (same as
  `get_org_user_storage`).
- New acl entry `get_guest_share_events` in `acl/admin.json` documenting the
  no-IP/no-action data limitation.

### 5. Locale (ui-team)

New UPPERCASE keys in `locale/en.json`, mirrored to fr/es/ru/zh/km:
`EXTERNAL_GUEST_ACTIVITY`, `EXTERNAL_GUEST_ACTIVITY_DESC`, `GUEST`,
`RESOURCE`, `SHARED_BY`, `LINK_TYPE`, `PUBLIC_LINK`, `PROTECTED_LINK`,
`OPENED`, `DURATION`, `ANONYMOUS_GUEST`, `NO_GUEST_EVENTS`,
`GUEST_EVENTS_LOAD_FAILED`. (`WORKSPACE`, `SHOWING_OF`, `LOADING` reuse
existing keys.)

FE uses `LOCALE.X || "Fallback"` like the rest of `apps-main`, so the feature
works even before the locale deploy lands.

## Error handling

- Loader failures set `_guestState = "error"` → table shows
  `GUEST_EVENTS_LOAD_FAILED` row (mirror of `AUDIT_LOAD_FAILED`).
- Service returns `NO_ORG` / non-OK → treated as error state, warn-logged.
- Node-name enrichment failures degrade to showing `node_id` — never block the
  response.

## Testing (no test runner — manual/live)

1. Deploy procs to `yp`, admin-api + admin-console via `npm run dev`.
2. As test.owner1 (org admin, domain 2): Audit tab shows the guest table, no
   stat boxes; existing secure-share access events on stage appear org-wide.
3. Round-trip via `Wm.postService('admin.get_guest_share_events', {...})`:
   envelope shape, date-range filtering, pagination.
4. Guest-filter check: events by org members must not appear; anonymous +
   cross-domain opens must.
5. Flip `_showAuditInsights = true` → boxes render again (restore path).

## Out of scope (YAGNI)

- Logging downloads / IP / user-agent (needs new write-path columns — separate feature).
- CSV export of guest events.
- Per-guest search box (the date-range filter suffices for v1).
- Realtime WS refresh of the table.
