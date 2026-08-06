# Workspace Creation Tracking — Design

**Date:** 2026-08-06
**Repos:** `ui-team` (trigger), `server-team` (service + ACL), `analytics-server` (procs + backfill)

## Summary

The analytics dashboard's **Referral users** table gained a Workspaces column on
2026-08-06, counting hubs the user owns. That count has two holes: it cannot see
a **Personal** workspace (which is a home-root folder, not a hub) and it drops to
zero when a workspace is deleted.

This design replaces the ownership count with an **event count**. The workspace
creation form fires a tracking call on every successful create — Team, Share and
Personal — the server records one `yp.services_log` row per creation, and the
Workspaces column counts those rows. Existing workspaces are backfilled from
`yp.hub` so no history is lost.

## Scope

**In scope**

- New service `desk.track_workspace` — `server-team/service/private/desk.js` +
  `server-team/acl/desk.json`
- Tracking trigger in `ui-team/src/drumee/builtins/media/form/index.js`, on both
  success paths
- `workspaces` and `activated` re-sourced in
  `analytics-server/schemas/procedures/yp/referral_members.sql` and
  `referral_activation.sql`
- One-shot idempotent backfill in `analytics-server/schemas/patches/`
- Changelog entry in `analytics-server/schemas/patches/changelog.txt`

**Out of scope**

- No new table. The event rides the existing `yp.services_log`.
- No change to `desk.create_hub` itself, and no server-side tracking write. The
  trigger lives in the form only — see "Accepted limitations".
- The three other `desk.create_hub` callers (`window/hub/sharebox`,
  `window/hub/website`, `window/hub/team`) get no trigger.
- The Uploads column, which counts workspace and folder creation as uploads.
  Pre-existing and separately decided.
- No UI beyond the trigger: the column, its header and its grid track already
  ship.

## Why an event, not ownership

The form creates three things a user calls a workspace, and only two are hubs:

| Type | Path taken by `_submit()` | In `yp.hub`? |
|---|---|---|
| Team | `desk.create_hub`, area `private` | yes |
| Share | `desk.create_hub`, area `share` | yes |
| Personal | `Wm.createFolderFromDialog` → `media.make_dir` | **no** |

`media/form/index.js:99-101` states why Personal takes the folder path: it is the
legacy private folder at the home root, only *presented* as a workspace type, and
routing it through `desk.create_hub` would add membership and sidebar semantics it
must not have. That is not going to change, so ownership counting can never see
it. An event fired by the form sees all three, because the form is the one place
that knows which of the three the user asked for.

## Component 1 — the event

New service `desk.track_workspace`.

**ACL** (`server-team/acl/desk.json`), alongside `create_hub`:

```json
"track_workspace": {
  "doc": "Record that the caller created a workspace from the workspace form (ui-team builtins/media/form). One yp.services_log row per creation, written by the router's `log` flag; the analytics Referral users table counts these rows for its Workspaces column and its Activated badge. Covers the Personal type, which is a home-root folder rather than a hub and is therefore invisible to yp.hub.",
  "scope": "hub",
  "permission": { "src": "owner" },
  "log": true,
  "params": {
    "wid":      { "type": "string", "required": true,  "doc": "workspace id — hub id for team/share, folder nid for personal. Dedupe key." },
    "type":     { "type": "string", "required": true,  "doc": "team | share | personal" },
    "area":     { "type": "string", "required": false, "doc": "yp.entity.area the workspace was created with" },
    "filename": { "type": "string", "required": false, "doc": "name the user typed" }
  },
  "returns": { "type": "object", "properties": { "ok": { "type": "boolean" } } }
}
```

`"log": true` is the entire write path. `router/rest/index.js:108-112` calls
`session.log_service()` for any service carrying the flag, which posts the
`yp.analytics_log` proc — a plain `INSERT INTO services_log` of name, args, uid,
hub_id, headers and `UNIX_TIMESTAMP()`. `desk.create_hub` and `desk.home` are
already logged this way, and the Referral table's Shares column already counts
`secure_share.create` rows from the same table. Nothing new is invented.

**Handler** (`server-team/service/private/desk.js`), a stub — the row is the
product, and it is already written by the time the handler runs:

```js
async track_workspace() {
  this.output.data({ ok: 1 });
}
```

`permission.src` is `owner`, matching `desk.create_hub` and `reward.track`: only
the workspace's creator posts its creation, on their own desk.

## Component 2 — the trigger

`ui-team/src/drumee/builtins/media/form/index.js` gains one helper modelled on
`reward-flow/index.js:601-616`:

```js
_trackWorkspace(type, opt = {}) {
  if (typeof SERVICE === "undefined" || !SERVICE.desk || !SERVICE.desk.track_workspace) {
    return Promise.resolve(null);
  }
  try {
    return this.postService(SERVICE.desk.track_workspace, {
      hub_id: Visitor.id,
      wid: opt.wid,
      type,
      area: opt.area,
      filename: opt.filename,
    }).catch(() => null);
  } catch (e) {
    return Promise.resolve(null);
  }
}
```

Called at the two points that already mark a confirmed success, immediately
before the `RADIO_BROADCAST.trigger("workspace:refresh", …)` each path fires:

- **Personal**, `index.js:119` — inside the `.then((created) => …)`, after the
  `if (!created || created.error) return;` guard. `wid` is
  `created.nid || created.id`, `area` is `_a.personal`.
- **Team / Share**, `index.js:170` — after the in-band error check that returns
  on `hub.error || hub.error_code`. `wid` is `hub.hub_id || hub.id`, `area` is
  `hub.area || area`.

Both call sites already prove success and already have the id the row needs, so
the trigger adds a line, not a branch.

**Fire-and-forget.** The result is never awaited and never checked. The
team/share path opens a permission panel or the Manage-access dock straight
after; making that wait on an analytics row would trade a visible delay for a
number on an admin dashboard. Guarded on `SERVICE.desk.track_workspace` existing
so a UI built against an older server degrades to doing nothing, and wrapped so a
rejected post can never surface as a form error.

## Component 3 — counting and backfill

`workspaces` in `referral_members.sql` re-sources to the event:

```sql
(SELECT COUNT(*) FROM services_log s
  WHERE s.uid = d.id AND s.name = 'desk.track_workspace') AS workspaces
```

and the `activated` flag in **both** `referral_members.sql` and
`referral_activation.sql` swaps its hub `EXISTS` for the same predicate, staying
in lockstep so the Status badges and the Activation-rate tile cannot disagree.

The UI keeps its own `n(r.workspaces) > 0 → Activated` test in
`analytics-ui/app/referral-track/skeleton/index.js`; it needs no change, because
it reads the column rather than its source.

**Backfill** — `analytics-server/schemas/patches/backfill_workspace_track.sql`,
one-shot but safe to re-run:

```sql
INSERT INTO services_log (name, args, uid, hub_id, headers, ctime)
SELECT
  'desk.track_workspace',
  JSON_OBJECT('wid', h.id, 'type', IF(e.area = 'share', 'share', 'team'),
              'area', e.area, 'backfill', 1),
  h.owner_id, h.owner_id, '{}', e.ctime
FROM hub h INNER JOIN entity e ON e.id = h.id
WHERE e.type = 'hub' AND e.area IN ('private', 'share')
  AND NOT EXISTS (
    SELECT 1 FROM services_log s
    WHERE s.name = 'desk.track_workspace'
      AND JSON_VALUE(s.args, '$.wid') = h.id
  );
```

`services_log.name` is indexed, so the guard scans only tracking rows, not the
110k-row table. `sys_id` is auto-increment and omitted. The `hub_id` column is
the creator's own desk, not the created workspace — that is what
`log_service()` writes for a live row (`this.hub.get(Attr.id)`), so the backfill
matches it and the workspace id lives in `args.$.wid` on both.

The `NOT EXISTS` on `$.wid` is what makes this re-runnable, and re-running it is
the reconciler for the limitation below. It qualifies for `manifest.txt` under
the file's MANIFEST SAFETY RULE, unlike the four excluded destructive patches.

Expected result on stage, matching today's ownership count exactly:
`huancr7lm10@gmail.com` → 4, `kienhao.pb@gmail.com` → 1, the two
`h0anghu7n` accounts → 0.

## Accepted limitations

**Deleted workspaces keep counting.** Inherent to counting creations. The column
answers "did this referred user ever build a workspace", which is the activation
question the table exists to answer.

**Only this form is tracked.** `desk.create_hub` has three other callers —
`builtins/window/hub/sharebox/index.js:89`, `window/hub/website/index.js:97`,
`window/hub/team/index.js:64`. A hub created from one of those writes no
tracking row and stays invisible to the column until the backfill is re-run,
which inserts a row for any hub that lacks one. This is a deliberate choice: the
trigger stays in the form. The alternative — writing the row inside
`desk.create_hub`, covering all four callers live — was considered and declined.

**Personal history starts at ship date.** A personal workspace is a home-root
folder; `mfs_changelog` cannot tell one from any other folder, so there is
nothing truthful to backfill. Team and Share history is exact.

## Error handling

Every layer fails to *nothing*, never to a broken workspace:

- Trigger: guarded, caught, unawaited. A missing service, a rejected post or a
  thrown `postService` all resolve to `null` and the form proceeds.
- Server: `log_service()` is already wrapped in `try/catch` at
  `router/rest/index.js:108-112`; a logging failure logs a console warning and
  the request continues.
- Analytics: a user with no rows counts 0, which is the truthful answer for
  someone who has created nothing.

## Testing

- **Team**: create from the form → one `desk.track_workspace` row, `type=team`,
  `wid` = new hub id; permission panel opens with no added delay.
- **Share**: same, `type=share`; the Manage-access dock still opens.
- **Personal**: same, `type=personal`, `wid` = folder nid — the case ownership
  counting cannot see, and the reason this design exists.
- **Failure**: refuse the post (quota block path / offline) → form behaves
  exactly as today, no row, no error surfaced.
- **Backfill**: run twice on stage; second run inserts 0 rows. Confirm the four
  referred users read 4 / 1 / 0 / 0, unchanged from the ownership count.
- **Badge**: `kienhao.pb@gmail.com` (1 workspace, 9 days idle) still reads
  **Activated**, not Dormant.

## Files

| Repo | File | Change |
|---|---|---|
| `server-team` | `acl/desk.json` | add `track_workspace` with `"log": true` |
| `server-team` | `service/private/desk.js` | add `track_workspace()` stub |
| `ui-team` | `src/drumee/builtins/media/form/index.js` | `_trackWorkspace()` + two call sites |
| `analytics-server` | `schemas/procedures/yp/referral_members.sql` | `workspaces` + `activated` re-sourced |
| `analytics-server` | `schemas/procedures/yp/referral_activation.sql` | `activated` re-sourced |
| `analytics-server` | `schemas/patches/backfill_workspace_track.sql` | new, idempotent |
| `analytics-server` | `schemas/patches/manifest.txt` | list the backfill |
| `analytics-server` | `schemas/patches/changelog.txt` | dated entry |
