# GDrive migration popup — reconnect to in-flight job

**Date:** 2026-05-29
**Status:** approved → implemented

## Problem

The Google Drive migration runs in a persistent Bull worker (Redis), but the
popup's state (`_jobId`, polling) lives only on the widget instance. When the
user closes the popup, leaves Settings, reloads the page, or opens another
tab/device while a migration is running, the popup loses track of the job: on
reopen `_refreshScope()` only checked `has_drive_scope` and dropped the user on
the **"Start migration"** screen — orphaning the running job in the UI and
allowing a duplicate to be enqueued.

## Decisions (from brainstorming)

- **Resume scope:** all exit paths — close popup, leave Settings, full reload,
  other tab/device. ⇒ must be **server-driven** (client can't rely on a
  remembered `job_id` or localStorage).
- **Finished while closed:** show the result **once**, then fall back to ready.
  ⇒ needs a server-side "acknowledged" marker (cross-device).
- **Discovery mechanism:** **query Bull by `user_id`** (Bull is the source of
  truth — no state sync, no extra worker writes).

## Design

### Server (`server-team`)

1. `offline/queues/migrationQueue.js` — `getUserJob(userId)`: scans the bounded
   retained jobs (`getJobs([...], 0, 300)`), filters by `job.data.user_id`,
   prefers an in-flight job (active/waiting/delayed/paused) else the most
   recently finished, and returns the `getJobStatus` snapshot (or null).
2. `service/private/google_drive.js`
   - `_shapeStatus(snap)` — extracted from `get_status`; maps Bull state →
     FE status (queued/running/done/failed/cancelled) + flat counts. Shared by
     `get_status` and `get_state`.
   - `get_state()` — popup-open endpoint, one round-trip:
     `{ ok: <has drive scope>, job: <shaped getUserJob|null>, seen_job_id }`.
   - `start_migration()` — dedup guard: if `getUserJob` returns an in-flight
     job, return `{ job_id, already_running: 1 }` instead of enqueuing a dup.
   - `ack_result()` / `_getSeenJob()` — read/write `profile.gdrive_seen_job`
     (mirrors `_setMigrationSkipped`'s profile read-modify-write).
3. `acl/google_drive.json` — register `get_state` + `ack_result` (scope hub,
   src owner), matching the existing entries.

### Frontend (`ui-team`)

`builtins/widget/migrate-gdrive-popup/index.js`:
- `initialize` adds `_seenJobId`.
- `_refreshScope()` now calls `get_state` and resolves the full state:
  1. job running → reconnect (`_jobId`, in-progress, resume poll);
  2. job finished & `job_id !== seen_job_id` → show that result once;
  3. else → ready / not-connected (scope).
- `_close()` acks (`ack_result`) when closing from a done/failed/cancelled view.
- `start_migration`'s `already_running` response carries `job_id`, so the
  existing resume path handles it with no extra code.
- The OAuth-connect handler and `gdrive-retry-connect` reuse `_refreshScope`,
  and the desk auto-launch inherits reconnection for free.

## Edge cases

- Job aged out of Bull → `getUserJob` null → ready.
- Singleton popup still alive on re-launch → `raise()` shows it as-is (already
  polling); a fresh instance reconnects via `get_state`.
- Worker crash/stalled → Bull state reflects it; cancel still works.
- Multiple tabs poll independently and converge; ack in one tab persists to
  profile so others stop replaying the result.

## Testing (no test runner — manual)

1. Start → close (X) mid-run → reopen from Settings → shows progress.
2. Reload page mid-run → reopen → shows progress.
3. Open a 2nd tab mid-run → shows progress.
4. Finish while closed → reopen → result shown once → Close → reopen → ready.
5. Click Start while a job runs (race) → no duplicate; resumes existing
   (verify Bull has a single active job for the user).

## Deploy

- server-team: sync + `pm2 restart gdrive-worker` is NOT needed for these
  (changes are in the `vudangnt`/`*/service` process, not the worker) — restart
  the endpoint service. The worker is unaffected.
- ui-team: rebuild FE + `pm2 restart vudangnt` (bundle/manifest cache).
