# Google Drive → Drumee Migration

**Date:** 2026-05-23
**Branches (target, all off `preview`):**
- `schemas`: `feat/oauth-scope-and-migration-jobs`
- `server-team`: `feat/gdrive-migration-worker`
- `ui-team`: `feat/migrate-gdrive-popup-launcher`
- `onboarding-ui`: `feat/post-onboarding-gdrive-handoff`

**Status:** Draft (Approach B / Phase 1+2 — see `docs/research/2026-05-23-gdrive-migration-research.md` in session memory)

---

## Problem

Drumee ships an orphan Google Drive migration popup and a server endpoint
that calls Drive APIs, but the flow is non-functional:

1. The OAuth token captured during Google sign-in only requests `email`,
   `profile` scopes — every call to `drive/v3/files` returns 401.
2. The `migrate-gdrive-popup` widget is not registered in `seeds.js` and
   has no launcher anywhere in the UI.
3. The migration runs synchronously inside the HTTP request thread, so any
   non-trivial Drive will time out before the worker finishes.
4. There's no token refresh, no pagination, no Shared Drive support, no
   conflict policy, no progress feedback, and no resume after failure.

Onboarding already asks the user which existing tools they use; **Google
Drive** is one of the options (`TOOL_OPTS[0]`). The user explicitly wants
that signal to drive the post-onboarding handoff so the migrate flow
appears at the right moment without an extra click.

## Goals (Phase 1 + Phase 2)

### Phase 1 — Unblock & ship

1. Drive-scope OAuth flow that elevates the existing `oauth_accounts`
   row with `drive.readonly` access + refresh token.
2. Auto-refresh of expired access tokens (no user-visible failure mid-import).
3. Schema additions: `oauth_accounts.scope`, `oauth_accounts.expires_at`,
   new `migration_jobs` table.
4. Background worker process consuming a Bull queue
   (`migrationQueue`) — request handler returns `job_id` immediately.
5. Pagination loop on Drive `files.list` (no truncation at 100/1000 items).
6. Shared Drives opt-in checkbox in the popup (`includeItemsFromAllDrives`).
7. Conflict policy = `skip` only (silent skip on path match) — same as today.
8. Polling-based progress (`google_drive.get_status?job_id=X`).
9. Register `migrate_gdrive_popup` in `seeds.js`; add launcher in
   Settings → "Linked accounts".
10. Post-onboarding handoff: if `profile.tools` contains `google_drive` AND
    the user has no completed `migration_jobs` row → auto-launch the popup
    once after the user lands on the Desk; "Skip for now" closes it and
    sets a `tools_migration_skipped` flag so it does not nag.

### Phase 2 — Polish

11. WebSocket progress push via `RedisStore.sendData` (replace polling;
    polling stays as fallback for transient WS drops).
12. Conflict policy UI: radio for `skip` / `overwrite` / `rename`.
13. Cache cleanup for `_importFileInternal`'s tmp downloads (TTL + LRU bound).
14. Preserve Drive `createdTime` / `modifiedTime` onto the MFS node.
15. Workspace export expansion: Google Forms (skip with note), Sites
    (skip with note), Shortcuts (follow `shortcutDetails.targetId`),
    Jamboard (PDF).
16. Email summary to the user when a job finishes (`butler/migration-complete.html`).
17. Per-file error log persisted in `migration_jobs.errors_json` exposed in
    the popup's "View errors" expander.

## Non-Goals

- Drive ACL → Drumee permission mapping (Phase 3).
- Resume of failed/cancelled jobs (Phase 3).
- Continuous-sync watcher of Drive changes (Phase 3).
- Migration from any other provider (Dropbox, OneDrive). The base class
  `ExtImport` stays generic but only `GoogleDrive` is implemented.
- Touching the Google sign-in flow in `loby/service/google.js`. The
  Drive-scope OAuth is a SEPARATE consent step from the login OAuth.

## Architecture

### Component map

```
┌─────────────────────────────────────────────────────────┐
│ onboarding-ui                                            │
│   step 4 (tools): user picks google_drive               │
│   POST onboarding.save_tools { tools: ['google_drive']} │
└─────────────────────────┬───────────────────────────────┘
                          │
┌─────────────────────────┴───────────────────────────────┐
│ ui-team (Desk module)                                    │
│   On boot, after Visitor.profile() loads:               │
│     IF tools.includes('google_drive')                    │
│     AND no migration_jobs.user_id row for provider=google│
│     AND not tools_migration_skipped                      │
│     THEN auto-launch migrate_gdrive_popup                │
│                                                          │
│   migrate-gdrive-popup widget:                          │
│     1. CHECK CONNECT: GET google_drive.has_drive_scope  │
│        ┌─ no  → "Connect Google Drive" button           │
│        │           opens auth_url popup, waits callback │
│        └─ yes → step 2 (settings form)                  │
│     2. SETTINGS: source folder + Shared Drives toggle   │
│         + conflict policy radio (Phase 2)               │
│     3. CONFIRM + Start → POST google_drive.start_migration│
│     4. PROGRESS: bindEvent('migration:{job_id}')        │
│        WS push (Phase 2) or poll every 2s (Phase 1)     │
│     5. DONE: summary + close OR "View errors" expander  │
└─────────────────────────┬───────────────────────────────┘
                          │
┌─────────────────────────┴───────────────────────────────┐
│ server-team (HTTP request handlers — Mfs subclass)       │
│   service/private/google_drive.js                       │
│     connect()              → returns auth_url           │
│     get_callback(code)     → exchange + UPDATE oauth_accounts│
│     has_drive_scope()      → boolean                     │
│     start_migration(opts)  → INSERT migration_jobs,     │
│                              enqueue job, return job_id  │
│     get_status(job_id)     → row state + stats          │
│     cancel(job_id)         → mark cancelled + queue.remove│
└─────────────────────────┬───────────────────────────────┘
                          │ Bull enqueue (Redis)
┌─────────────────────────┴───────────────────────────────┐
│ server-team (background worker process, PM2-managed)     │
│   offline/queues/migrationQueue.js                      │
│   offline/workers/gdriveWorker.js                       │
│     processor:                                          │
│       ensureFreshToken('google', user_id)               │
│       traverseFolder(root, paginated)                   │
│       for each file:                                    │
│         download → _importFileInternal                  │
│         UPDATE migration_jobs SET processed += 1        │
│         push WS: { event:'migration:progress', ... }    │
│       on error: append to errors_json, continue         │
│       on done: status='done', push 'migration:complete' │
└─────────────────────────────────────────────────────────┘
```

### Why a separate OAuth consent (NOT touching sign-in scope)

Asking for `drive.readonly` at sign-in would force every Google-signin user
to grant Drive access even if they never want migration — that is a
high-friction privacy ask. Instead we keep sign-in at `email`/`profile`
and request the elevated scope only when the user clicks "Connect Google
Drive" in the popup. The OAuth `state` parameter carries the user's
session so the callback can UPDATE the same `oauth_accounts` row that
sign-in created (no second row).

### Why a background worker (NOT inline)

Drive of a single power user can easily be 50–500 GB. A linear download
loop in the HTTP request thread:
- exceeds the proxy timeout (HAProxy 60s default at Drumee),
- holds a database connection for the duration,
- has no progress feedback,
- has no resume on crash.

Bull + a separate worker process is already the established pattern in
this codebase (`trashWorker.js`, `indexWorker.js`, `expiryWorker.js`),
and the queue + Redis infrastructure is already provisioned.

### Why WebSocket push for progress (Phase 2)

Polling every 2s × N concurrent migrations × N users = unnecessary load.
The Drumee notification path (`RedisStore.sendData` → user sockets →
widget `onWsMessage`) is already used by hubs, chat, and activity panel.
Phase 1 keeps polling as a fallback so the basic flow ships sooner.

## Schema changes

`schemas/yellow_page/tables/oauth_accounts.sql` — ALTER TABLE:

```sql
ALTER TABLE oauth_accounts
  ADD COLUMN scope VARCHAR(512) NULL AFTER refresh_token,
  ADD COLUMN expires_at INT UNSIGNED NULL AFTER scope;
```

`scope` stores the space-separated scope list returned in the OAuth
response. `expires_at` is the absolute unix timestamp computed from
`expires_in` at exchange time. Both are NULL for rows written by the
legacy sign-in flow — code treats NULL as "unknown / refresh required
before use".

`schemas/yellow_page/tables/migration_jobs.sql` (NEW):

```sql
CREATE TABLE IF NOT EXISTS migration_jobs (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id         VARCHAR(16)    NOT NULL,
  provider        ENUM('google','dropbox','onedrive') NOT NULL,
  source_folder_id VARCHAR(255)  NOT NULL DEFAULT 'root',
  dest_hub_id     VARCHAR(16)    NOT NULL,
  dest_nid        VARCHAR(16)    NOT NULL,
  status          ENUM('queued','running','done','failed','cancelled') NOT NULL DEFAULT 'queued',
  conflict_policy ENUM('skip','overwrite','rename') NOT NULL DEFAULT 'skip',
  include_shared_drives TINYINT(1) NOT NULL DEFAULT 0,
  total_files     INT UNSIGNED   NOT NULL DEFAULT 0,
  processed_files INT UNSIGNED   NOT NULL DEFAULT 0,
  total_folders   INT UNSIGNED   NOT NULL DEFAULT 0,
  errors_json     MEDIUMTEXT     NULL,
  started_at      INT UNSIGNED   NULL,
  finished_at     INT UNSIGNED   NULL,
  ctime           INT UNSIGNED   NOT NULL,
  PRIMARY KEY (id),
  KEY idx_user_status (user_id, status),
  KEY idx_provider_user (provider, user_id),
  CONSTRAINT fk_migration_user FOREIGN KEY (user_id) REFERENCES entity(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

`total_files = 0` while the job hasn't finished its initial traversal;
worker updates it after the first folder scan completes (best-effort
estimate; recursive subfolder scans append). `errors_json` is appended as
items fail so the user sees per-file failure detail.

`profile.tools` in `drumate.profile` JSON already exists from onboarding
(`save_tools` writes it). No schema change there. We add one new JSON
field `profile.tools_migration_skipped` (object keyed by tool name) to
silence the post-onboarding auto-launch after the user dismisses.

## Server endpoints (replace existing `google_drive.js`)

| Endpoint | In | Out | Notes |
|---|---|---|---|
| `google_drive.has_drive_scope` | — | `{ ok: boolean }` | Reads oauth_accounts row, returns true if `scope` contains `drive.readonly` AND (`expires_at` is null OR refresh_token present) |
| `google_drive.connect` | — | `{ auth_url }` | Builds Google OAuth URL with `scope=drive.readonly`, `access_type=offline`, `prompt=consent`, state carries `{ uid, sid, intent: 'gdrive_migrate' }` |
| `google_drive.callback` (under `butler` ACL, public) | `{ code, state }` | redirect to closing page | Server exchanges code, UPDATEs oauth_accounts (access_token, refresh_token, scope, expires_at); FE popup window detects the closing-page URL and resumes its flow |
| `google_drive.start_migration` | `{ hub_id, nid, source_folder_id?, include_shared_drives?, conflict_policy? }` | `{ job_id }` | INSERT migration_jobs (status='queued'), `migrationQueue.add('migrate_google_drive', { job_id })`, return |
| `google_drive.get_status` | `{ job_id }` | `{ status, processed_files, total_files, total_folders, errors: [...] }` | Reads migration_jobs row by id (filtered by `user_id = this.uid`) |
| `google_drive.cancel` | `{ job_id }` | `{ ok }` | UPDATE status='cancelled', remove queued/active job from Bull (no-op if already done) |
| `google_drive.dismiss_post_onboarding` | — | `{ ok }` | Sets `profile.tools_migration_skipped.google_drive = 1` so Desk auto-launch stops |

`google_drive.import_file` / `import_directory` are REMOVED (inline path
replaced by queue flow). The base class `ExtImport._importFileInternal`
stays — the worker calls it.

## Token refresh

In `service/lib/ext_import.js` add:

```js
async ensureFreshToken(provider) {
  const row = (await this.yp.await_query(
    'SELECT access_token, refresh_token, expires_at, scope FROM oauth_accounts WHERE user_id=? AND provider=?',
    this.uid, provider
  ))[0];
  if (!row) throw new Error('NEEDS_RECONNECT');
  const now = Math.floor(Date.now() / 1000);
  const safety = 60;
  if (row.expires_at && row.expires_at - safety > now) return row.access_token;
  if (!row.refresh_token) throw new Error('NEEDS_RECONNECT');
  // refresh
  const { google } = require('googleapis');
  const oauth2 = new google.auth.OAuth2(
    Cache.getSysConf('google_client_id'),
    Cache.getSysConf('google_client_secret')
  );
  oauth2.setCredentials({ refresh_token: row.refresh_token });
  const { credentials } = await oauth2.refreshAccessToken();
  const newExpiresAt = Math.floor(Date.now() / 1000) + (credentials.expiry_date
    ? Math.floor((credentials.expiry_date - Date.now()) / 1000)
    : 3500);
  await this.yp.await_query(
    'UPDATE oauth_accounts SET access_token=?, expires_at=?, mtime=UNIX_TIMESTAMP() WHERE user_id=? AND provider=?',
    credentials.access_token, newExpiresAt, this.uid, provider
  );
  return credentials.access_token;
}
```

The worker calls `ensureFreshToken('google')` at job start AND after any
401 from Drive. `NEEDS_RECONNECT` is surfaced as a job failure with
`errors_json[0].code='NEEDS_RECONNECT'`; the popup detects this and shows
the "Connect Google Drive" button again.

## Pagination & Shared Drives

In the worker's `listFolder(folderId, accessToken, opts)`:

```js
let pageToken;
const items = [];
do {
  const { data } = await axios.get('https://www.googleapis.com/drive/v3/files', {
    headers: { Authorization: `Bearer ${accessToken}` },
    params: {
      q: `'${folderId}' in parents and trashed = false`,
      pageSize: 1000,
      pageToken,
      fields: 'nextPageToken, files(id, name, mimeType, size, modifiedTime, createdTime, fileExtension, webContentLink, shortcutDetails)',
      supportsAllDrives: opts.includeSharedDrives,
      includeItemsFromAllDrives: opts.includeSharedDrives,
      corpora: opts.includeSharedDrives ? 'allDrives' : 'user',
    },
  });
  items.push(...data.files);
  pageToken = data.nextPageToken;
} while (pageToken);
return items;
```

## Worker loop (sketch)

```js
// offline/workers/gdriveWorker.js
const { migrationQueue } = require('../queues/migrationQueue');
const GoogleDriveImporter = require('./gdrive/importer');

migrationQueue.process('migrate_google_drive', 2 /* concurrency */, async (job) => {
  const { job_id } = job.data;
  const importer = new GoogleDriveImporter(job_id);
  await importer.run();
});
```

`GoogleDriveImporter.run()`:
1. Load migration_jobs row, mark `status='running'`, `started_at=now`.
2. `ensureFreshToken('google')`.
3. Resolve dest folder via `mfs_node_attr(dest_nid)`.
4. Recursive traversal — depth-first to keep memory bounded.
5. For each file: download → `_importFileInternal` → `processed_files += 1`.
   Update DB every 25 files (batching). Push WS event every update.
6. Catch per-file errors, append to `errors_json`, continue.
7. On finish: `status='done'`, `finished_at=now`, push `migration:complete` WS.
8. On uncaught throw: Bull retries 3× with exp backoff. If exhausted,
   mark `status='failed'`. WS event `migration:failed`.

## Post-onboarding handoff (in Desk module)

Add to `ui-team/src/drumee/modules/desk/index.js` after the existing
boot-time profile load:

```js
async _maybeAutoLaunchGDriveMigration() {
  const profile = Visitor.profile() || {};
  const tools = profile.tools || [];
  if (!tools.includes('google_drive')) return;
  const skipped = (profile.tools_migration_skipped || {}).google_drive;
  if (skipped) return;
  // Has the user already started/completed a Google migration?
  const r = await this.fetchService('google_drive.get_status', { latest_only: 1 });
  if (r && r.status && r.status !== 'cancelled') return;
  // Otherwise auto-launch the popup with a "Skip for now" affordance.
  Wm.launch({ kind: 'migrate_gdrive_popup', autoFromOnboarding: 1 });
}
```

The popup shows an extra "Skip for now" link when `autoFromOnboarding`
is set; clicking it calls `google_drive.dismiss_post_onboarding` and
closes. The popup is also still launchable from Settings → Linked
accounts at any time.

## UX states (popup)

```
┌────────────────────────────────────────────┐
│ Migrate from Google Drive             [X]  │
│                                            │
│ ① CHECK CONNECT (initial fetch)            │
│   spinner → branch                         │
│                                            │
│ ② NOT CONNECTED                            │
│   "We need access to your Google Drive."   │
│   [ Connect Google Drive ]                 │
│   (opens auth popup window)                │
│                                            │
│ ③ CONNECTED, READY                         │
│   Destination: My Home (read-only)         │
│   ☐ Include Shared Drives                  │
│   Conflict: ● Skip  ○ Overwrite  ○ Rename │  ← Phase 2
│   Source folder ID: [____________] (blank=My Drive)│
│   [ Cancel ]            [ Start migration ]│
│   "Skip for now" (only when autoFromOnboarding)│
│                                            │
│ ④ IN PROGRESS                              │
│   [████████░░░░░░] 47 of 120 files         │
│   "Importing  My Photos/2024-01.jpg"       │
│   3 errors so far. [ View errors ]         │
│   [ Cancel migration ]                     │
│                                            │
│ ⑤ DONE                                     │
│   "Imported 117 files in 23 folders."      │
│   "3 errors. [ View errors ]"              │
│   [ Close ]                                │
└────────────────────────────────────────────┘
```

## Errors & cancellation

| Failure | Surface |
|---|---|
| OAuth 401 mid-job | `ensureFreshToken` retries once; if it throws `NEEDS_RECONNECT`, job → `failed`, popup shows "Connect Google Drive" again |
| Per-file Drive 403 / not-downloadable | append to `errors_json`, continue; popup tally |
| Per-file storage write error | append + continue (same) |
| Worker process crash | Bull retry 3× exp backoff; on exhaustion → `status='failed'` |
| User clicks Cancel | server marks `cancelled`, Bull `job.remove()` if queued, worker checks status flag between files and exits cleanly |
| User closes popup mid-job | job keeps running; next open of popup resumes display from `get_status` |

## Testing

Drumee has no test runner; verification is manual.

### Manual journeys

1. **Cold connect flow:** brand-new Google-signin account with no Drive
   scope → popup shows "Connect Google Drive" → click → consent page →
   redirect closes popup → popup advances to ③ "ready".
2. **Small migration:** ~10 files, mix of regular + 1 Google Doc + 1
   Shared Drive folder. Verify all 10 land in MFS, Google Doc exports as
   PDF, Shared Drive folder respects toggle.
3. **Large migration sanity:** 100+ files across nested folders →
   progress bar advances smoothly; no HTTP timeout on the original
   request (returns `job_id` in <1s).
4. **Token-refresh mid-job:** manually expire `expires_at` mid-job
   (UPDATE row → 0) → confirm worker refreshes silently, no user impact.
5. **Cancel mid-job:** click Cancel during progress → worker exits at
   next file boundary, status='cancelled', popup closes.
6. **Conflict policy (Phase 2):** dest already has 5 files with matching
   names → with `skip`: 5 skipped; `overwrite`: 5 replaced; `rename`:
   5 new `foo (1).pdf` files.
7. **Onboarding handoff:** new user picks `google_drive` in onboarding
   step 4 → lands on Desk → popup auto-shows. Click "Skip for now" →
   reload page → popup does NOT re-show.
8. **Re-launch:** Settings → Linked accounts → "Migrate from Google
   Drive" → popup opens regardless of skip state.

### Load test

Single worker, single user, traverse a 1000-file fixture Drive (use a
seeded test account). Measure: total time, peak RSS of the worker
process, count of DB UPDATEs, errors. Acceptable: ≤ 1 worker RSS spike
< 300 MB, ≤ 2 DB updates per file.

## Rollout

- New branches per repo (see header). **Do not** push or merge without
  explicit approval (per [[feedback_git_branch_workflow]]).
- DB patches: `oauth_accounts` ALTER + `migration_jobs` CREATE on stage
  via `patch-from-file`. Production: same, scheduled.
- Worker requires a new PM2 entry (`gdriveWorker`); document in
  `offline/start.sh` and the deploy README.
- Feature gate: a `Cache.getSysConf('gdrive_migration_enabled', '0')`
  flag — the FE launcher reads this; off by default in prod until P1
  rollout day. Onboarding handoff also respects the flag.

## Risks

- **OAuth scope user backlash.** Requesting `drive.readonly` at consent
  time triggers Google's warning screen ("This app isn't verified" for
  ~weeks until app verification). Mitigate: submit Drumee for Google's
  OAuth verification on the same day P1 ships, present a clear in-app
  explanation before the consent redirect.
- **Worker contention with other queues.** Existing trash + index
  workers share Redis. Concurrency cap on `migrationQueue` = 2 (per
  worker instance) keeps Drive API rate-limit headroom and prevents
  one user's migration from starving the rest.
- **Drive rate limits.** Drive v3 default = 1000 queries / 100s / user.
  Our pagination + per-file metadata is well under that. Files API
  download quota = 750 GB/day/user (Workspace); enforce as a daily check
  on `start_migration` for power users (Phase 3).
- **Shared Drive permission edge cases.** A user with read access to a
  Shared Drive folder can list files but might not be able to download
  some (403). The per-file error path handles this — surface in the
  errors list, don't abort the whole job.
- **MFS quota / disk.** A 500 GB import will silently fill the user's
  Drumee quota. `start_migration` should pre-check `drumate.disk_usage`
  (Phase 2) and bail with a clear message if delta won't fit.
