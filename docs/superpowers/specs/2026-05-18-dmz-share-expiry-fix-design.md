# DMZ Share Expiry — Fix Design

**Goal:** Show the link-expiry remaining time correctly in the "Manage Access"
panel (days + hours), and block access to a share once its expiry has passed.

**Status:** Approved design — ready for implementation plan.

**Date:** 2026-05-18

---

## Background

A DMZ share link can carry an expiry. The owner sets it in the "Manage Access"
panel (`permission_share`); the server stores it and the DMZ share page
(`__dmz_sharebox`) reads it back on load.

Storage chain:
- `hub.update_external_settings` → `dmz_update_expiry_new(hub_id, nid, mode, expiry)`
  stores an **absolute timestamp** `expiry_time = now + expiry hours`
  (`expiry = days*24 + hours`).
- `dmz_settings` reads it back as **remaining** `days` / `hours` via
  `yp.duration_days()` / `yp.duration_hours()`, plus a `dmz_expiry` enum
  (`infinity` / `active` / `expired`).

### Two defects

**1. Expiry shows "No expiration" after it is set.**
`yp.duration_days()` returns `0` whenever the remaining time is under 86400s
(one day). So a "1 day" expiry, read back a few seconds later, comes back as
`days:0, hours:~24`. The `permission_share` label builder `formatExpiry()` (and
the unused `_expiryLabel()`) only look at `days` — `days:0` renders
"No expiration", hiding a live expiry.

**2. An expired share is still accessible.**
- Server `dmz.js` `login()` copies `dmz_expiry` into the response only inside
  `if (rows[0] && rows[0].hours !== null)`. When a share is **expired**,
  `duration_hours()` returns `NULL`, so the guard is false and `dmz_expiry` is
  **never sent** — exactly when it matters.
- FE `__dmz_sharebox.onDomRefresh()` only switches on `data.status`
  (`REQUIRED_PASSWORD`), never on `data.dmz_expiry`, so an expired share falls
  through to `getInfoData()` and loads normally.

`handleInfoStatus()` already has a `TICKET_EXPIRED` case that shows
`LOCALE.LINK_EXPIRES` — it is simply never reached for an expiry.

---

## Part 1 — Correct expiry display (days + hours)

**Files:**
- Modify: `src/drumee/builtins/permission/share/skeleton/index.js`

`formatExpiry` currently takes only `days`. Replace it with a `(days, hours)`
version (matches the existing inline English-string style; no new locale keys —
`NO_EXPIRATION` already exists):

```js
const formatExpiry = (days, hours) => {
  const d = ~~days;
  const h = ~~hours;
  if (d && h) {
    return `In ${d} Day${d !== 1 ? "s" : ""} ${h} Hour${h !== 1 ? "s" : ""}`;
  }
  if (d) return `In ${d} Day${d !== 1 ? "s" : ""}`;
  if (h) return `In ${h} Hour${h !== 1 ? "s" : ""}`;
  return LOCALE.NO_EXPIRATION || "No expiration";
};
```

In the module function, read `hours` alongside `days` and pass both to the
expiry-row label:

```js
  const days = parseInt(ui.mget(_a.days)) || 0;
  const hours = parseInt(ui.mget(_a.hours)) || 0;
  const expiryLabel = formatExpiry(days, hours);
```

The preset dropdown keeps calling `formatExpiry(preset)` — `hours` defaults to
`0` via `~~undefined`, so each preset still renders "In N Days" / "No expiration".

`_loadSettings()` in `permission/share/index.js` already stores both `days` and
`hours` from `get_external_room_attr` — no change there. The unused
`_expiryLabel()` method in that file is dead code (never called — the skeleton
builds the label); it is left as-is, out of scope.

---

## Part 2 — Block access to an expired share

**Files:**
- Modify: `server-team/service/dmz.js` (`login`)
- Modify: `src/drumee/modules/dmz/sharebox/index.js` (`onDomRefresh`)

### Server — always deliver `dmz_expiry`

In `dmz.js` `login()`, the block that copies the `dmz_settings` row is gated on
`rows[0].hours !== null`. Drop that part of the guard so `dmz_expiry` (which is
always one of `infinity` / `active` / `expired`) is forwarded even when
`days` / `hours` are `NULL` (infinity or expired):

```js
let rows = await this.yp.await_proc('forward_proc', info.hub_id, 'dmz_settings', ``);
if (rows[0]) {
  info.hours = rows[0].hours;
  info.days = rows[0].days;
  info.dmz_expiry = rows[0].dmz_expiry;
}
```

`days` / `hours` being `null` is already tolerated downstream (FE treats them
as `0`).

### FE — stop loading content when expired

In `__dmz_sharebox.onDomRefresh()`, after the `dmz.login` response is applied
and the default skeleton + `content` part are ready, check `data.dmz_expiry`
before the status switch:

```js
    this.feed(this.defaultSkeleton(this));
    await this.ensurePart(_a.content);

    if (data.dmz_expiry === _a.expired) {
      return this.handleInfoStatus(data);
    }

    switch (data.status) {
      case 'REQUIRED_PASSWORD':
        this.promptPassword();
        break;
      default:
        this.getInfoData();
    }
```

`handleInfoStatus(data)` already maps `data.dmz_expiry == _a.expired` →
`TICKET_EXPIRED` → `Dmz.say({ content: LOCALE.LINK_EXPIRES, btnService: 'redirect-to-home' })`.
Returning early means `getInfoData()` never runs, so no file list / content
loads — the guest sees only the "link expired" message.

---

## Data flow

```
Set expiry (owner, Manage Access)
  pick "In 7 Days" → update_external_settings days:7
  → dmz_update_expiry_new stores expiry_time = now + 168h
Reload Manage Access
  get_external_room_attr → dmz_settings → days/hours remaining
  → formatExpiry(days, hours) → "In 6 Days 23 Hours"  (was: "No expiration")

Guest opens an expired share
  dmz.login → dmz_settings dmz_expiry='expired'
  → server now forwards info.dmz_expiry='expired'  (was: dropped)
  → onDomRefresh sees data.dmz_expiry==='expired'
  → handleInfoStatus → "This link has been expired…" + Back-to-home button
  → getInfoData() skipped → no content
```

## Out of scope

- Per-request server enforcement (e.g. `media.show_node_by` rejecting an
  expired share mid-session). This fix blocks at share-page load, which covers
  the normal "open an expired link" case.
- i18n of the expiry label strings (`In N Days` is already English-hardcoded in
  the current code; not made worse, not fixed here).
- The unused `_expiryLabel()` method.
- The `yp.duration_days()` `< 86400 → 0` rounding itself — the FE now renders
  the `hours` remainder, so the rounding no longer hides anything.

## Testing (manual — Drumee has no test runner)

1. **Display:** Manage Access → set "In 7 Days" → Apply. Reload the panel →
   label shows the real remaining time including hours (e.g. "In 6 Days 23
   Hours"), never a false "No expiration".
2. **Short expiry:** set an expiry, let `days` decay below 1 → label shows
   "In N Hours", not "No expiration".
3. **Expired blocks access:** set a short expiry (or, for the test, a server
   row already past `expiry_time`); open the share link → the page shows
   "This link has been expired…" with a Back-to-home button, and no file list
   loads.
4. **Active share unaffected:** open a non-expired share → content loads
   normally; open an `infinity` share → content loads normally.
