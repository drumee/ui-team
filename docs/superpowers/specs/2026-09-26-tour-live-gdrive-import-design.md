# Live Google Drive import in the migrate tour's dialog

Date: 2026-09-26 · Branch: `test` · Status: design approved in chat, awaiting spec review

## 1. Goal

When the user presses **Done** on the in-window `migrate` tour, the tour's own
import dialog (`tutorial-migrate__dialog`) stops being a drawing and becomes the
real import: real service-account address, real Copy, real link field, real
**Import now**, then progress and result — all in that dialog.

The real `migrate_gdrive_popup` is **no longer opened** at the end of the tour.

### Agreed decisions

| Question | Decision |
|---|---|
| When does the dialog go live? | **After Done.** Screens copy / paste / verify stay mock with the callout; Done drops the callout and the same dialog becomes live. |
| What after the job starts? | **Progress in the tour dialog** (bar, counts, recent files, Cancel), then a result view. The folder window underneath is refreshed when the job finishes. |
| Architecture | **Shared controller** `libs/gdrive-sa-import.js`, used by both the tour and the popup's share-to-SA path. |
| Server has no SA key | The only case the popup still opens after the tour: hand off to it (it can fall back to OAuth). |

### Scope

In: share-to-SA flow only; in-window host only (`builtins/window/tutorial`).

Out: OAuth connect, Google Picker, the legacy folder tree (stay popup-only);
the desk-level `full` tour (no real window, stays mock, Done behaves as today);
server `google_drive.*` services (unchanged); every other popup launcher
(Settings, desk topbar + New, folder + New row, post-onboarding auto-launch —
unchanged).

## 2. Shared controller — `src/drumee/libs/gdrive-sa-import.js`

Plain module, no view code, unit-testable under `node:test`.

```js
const run = createSaImport({ service, hub_id, nid, direct, onChange, onFinished });
```

- `service`: any widget with `fetchService` / `postService`.
- `onChange(snapshot)`: called after every transition (and after a poll only
  when the status signature changed — same rule as the popup's `_lastPollSig`).
- `onFinished(job)`: called once when a job reaches `done|failed|cancelled`.

### States

```
loading ──get_state──▶ idle            (sa_email known; nothing running)
   │                    └─▶ in-progress   (a job already queued/running → reconnect)
   └──no SA key / error──▶ unavailable
idle ──verify(link)──▶ checking ──▶ verified | idle + error(code)
idle|verified ──start()──▶ starting ──▶ in-progress | idle + error(code)
in-progress ──poll every 2s──▶ done | failed | cancelled
in-progress ──cancel()──▶ cancelRequested=1 … ──▶ cancelled
done|failed|cancelled ──reset()──▶ idle
```

### API

| Method | Does | Server |
|---|---|---|
| `load()` | read address + running job | `google_drive.get_state` (`sa`, `sa_email`, `job`) |
| `verify(link)` | validate the pasted link | `google_drive.sa_check` |
| `start()` | verify if not yet, then enqueue | `google_drive.start_migration` `{hub_id, nid, direct_into, auth_kind:'sa', sa_folder, conflict_policy:'skip'}` |
| `attach(job_id)` | begin polling a job started elsewhere (popup's OAuth path) | — |
| `cancel()` | request cancel, idempotent while requested | `google_drive.cancel` |
| `ack()` | mark the finished result seen | `google_drive.ack_result` |
| `reset()` | ack if finished, clear folder/error/job/fileLog → `idle` | — |
| `dispose()` | stop the poll timer | — |
| `snapshot()` | `{ state, saEmail, folder, error, job, fileLog, cancelRequested }` | — |

Also exported: `errorText(code)` — the `SA_*` code → `LOCALE` table currently
inline in the popup skeleton (`SA_NOT_SHARED`, `SA_NOT_OWNER`,
`SA_NEEDS_GOOGLE`, `SA_BAD_LINK`, `SA_NOT_A_FOLDER`, fallback
`GDRIVE_SA_NOT_SHARED`), and `SOURCE_ACCESS_REVOKED` handling from
`_startMigration`.

`fileLog` is reconstructed client-side exactly as the popup's
`_trackFileLog` does (rolling 12, previous entry flips to done when the name
changes).

## 3. Tour step — `modules/desk/tutorial/migrate/`

### 3.1 Done no longer opens the popup

- Delete `_openTheRealThing()` and its call.
- On the last screen's `next-step`:
  - `live_capable` set (in-window host) → `triggerHandlers({ service: 'window-tutorial:go-live' })` and nothing else.
  - otherwise (desk host / `full`) → `triggerHandlers({ service: 'next-step' })`, as today.

### 3.2 `goLive(dest)`

Called by the host once its gates pass. Sets `this._live`, creates the
controller with `{ hub_id: dest.hub_id, nid: dest.nid, direct: 1 }`, renders
`skeleton/live.js` on every `onChange`, and calls `load()`. `onFinished` raises
`window-tutorial:refresh-target`. `onBeforeDestroy` calls `dispose()`.

While `_live`, `_showScreen` / mock services are inert.

### 3.3 `skeleton/live.js`

Uses the dialog's own `tutorial-migrate__*` classes (`__backdrop`, `__dialog`,
`__header`, `__heading`, `__close`, `__step`, `__step-label`, `__address`,
`__copy`, `__entry`, `__submit`) plus the popup's `__dest-card` block (as the
mock already does), so the live card is the same card the user was taught.
New classes only where no mock equivalent exists (status line, progress,
file log, result), prefixed `tutorial-migrate__live-*`.

| Controller state | Body |
|---|---|
| `loading` | card + "Loading…" line |
| `idle` / `checking` / `verified` / error | destination card (real name + `folderArt` from `dest.area`/`dest.filetype`); step 1 = real `saEmail` + Copy (`mg-live-copy`: clipboard + existing `data-done` tick, reverts after 1.8s); step 2 = `Skeletons.Entry` (`mode:'commit'`, `service:'mg-live-verify'`, `escapeContextmenu:true`); status line (`LOCALE.LOADING` / `GDRIVE_SA_FOUND` / `errorText(code)`); **Import now** (`GDRIVE_SA_IMPORT_NOW`, `mg-live-start`) |
| `starting` / `in-progress` | `MIGRATE_GDRIVE_IMPORTING_FROM`, `MIGRATE_GDRIVE_KEEP_OPEN`, byte-based bar + `MIGRATION_PROGRESS_X_OF_Y` + %, file log, Cancel (`MIGRATE_GDRIVE_CANCEL_JOB` / `…_CANCELLING`) |
| `done` | `MIGRATION_DONE_TITLE`, `MIGRATE_GDRIVE_SUMMARY_BASE` (+ skipped/errors counts); **Close**, **Migrate again** (`MIGRATE_GDRIVE_AGAIN` → `reset()`) |
| `failed` / `cancelled` | `MIGRATION_FAILED_TITLE` / `MIGRATION_CANCELLED_TITLE`, reason (`ACCESS_REVOKED` wording from the popup), **Try again** (`reset()`), **Close** |
| `unavailable` | nothing rendered; step raises `window-tutorial:fallback-popup` |

All strings already exist in `locale/*.json`; no new keys.

Cancel is caught by a `pointerup` capture listener on the step root (the
popup's `_installCancelDelegate` reason: the 2s re-feed replaces the button
between mousedown and mouseup).

Header × is real in live mode (`mg-live-close`); Close buttons raise the same.
Both → `window-tutorial:close-live`.

## 4. Host — `builtins/window/tutorial/index.js`

- `buildStepWidgets` payload gets `live_capable: 1` (this host only; the
  desk host does not pass it).
- `_markDone()` split: `_recordDone()` (once-guarded `markSeen`, unless
  preview) and the existing end. `_nextStep` keeps calling `_markDone()`.
  `_watchForSuccess`'s wrapper calls `_markDone()` only while NOT live; once
  `data-live="1"` it calls `_recordDone()` alone — imported files arriving in
  the window raise `newContent`, and ending the tour there would close the
  live dialog mid-import.
- New cases:

| Service | Action |
|---|---|
| `window-tutorial:go-live` | `_goLive()` below |
| `window-tutorial:close-live` | `_endTour()` |
| `window-tutorial:refresh-target` | `ws.refreshContent({})` if the window is alive (popup's `_refreshDestination` equivalent) |
| `window-tutorial:fallback-popup` | `_actOnWindow('launch-gdrive-migration')`, then `_endTour()` — the folder's `Tours.whenDone('migrate', …)` defers the popup until release |

`_goLive()`:
1. `_recordDone()` — walking to the end counts as completing the tour, as today.
2. `over-limit.isLocked()` → `notifyBlocked('write')`, `_endTour()`.
3. Target window lacks the write bit (`ws.mget(_a.privilege) & _K.permission.write`) → `permission-denied.sayWeakPrivilege(LOCALE.PERMISSION_ACTION_IMPORT, …, _K.permission.write)`, `_endTour()`.
4. `dest = ws.gdriveDestination()`; none (window gone) → `_endTour()`.
5. `spotlight.clear()`; `this.el.dataset.live = '1'`.
6. `step.goLive(dest)` (step = last child of the `content` part).

Escape: unchanged (`_endTour`) except it declines while the live link entry
has focus. Single-flight stays held for the whole live phase; release is the
existing destroy handler in the desk.

Leaving mid-import (× / Escape) does not cancel the server job; it is not
acked, so the popup's existing "show a finished result once" shows it on the
next open.

Skin: `[data-live="1"]` — nothing dimmed, dialog accepts input (`active`
controls), otherwise the same overlay geometry.

## 5. Folder window — `builtins/window/folder/index.js`

Extract `gdriveDestination()` from the `launch-gdrive-migration` case:
returns `{ hub_id, nid, name, area, filetype }` using the existing rules
(`actual_home_id` for a hub root, `hub_name`/`filename`, `destArea`,
`destFiletype`). The case calls it; behaviour unchanged.

## 6. Popup — `builtins/widget/migrate-gdrive-popup/`

- SA path uses the controller: `_saVerify`, `_saStart`, SA polling/cancel,
  and the inline `ERR_TEXT` go; `sa` / `in-progress` / result screens read
  `controller.snapshot()` through the existing getters.
- `_startMigration` (OAuth/picker/tree) keeps its own `start_migration`
  payload and hands the returned `job_id` to `controller.attach()` so polling
  exists once.
- Unchanged: OAuth, Picker, tree, `BroadcastChannel` cross-tab messages,
  visuals, `_close` / `_teardown`, `raise()`.

## 7. Testing

`node:test`, in `tests/`:

- `gdrive-sa-import.test.js` — fake service:
  `load` → idle / reconnect in-progress / unavailable; `verify` ok and each
  error code; `start` verifies first when needed; start error → idle+error;
  poll → done calls `onFinished` once; `onChange` suppressed on unchanged
  signature; `cancel` idempotent; `reset` acks; `dispose` stops the timer
  (fake timers).
- `tutorial-migrate-live-skeleton.test.js` — render `live.js` for every state
  with stub `Skeletons`; assert services, sys_pn, and that no mock fixture
  (`IMPORT_ADDRESS`, `SAMPLE_LINK`) leaks into live mode.
- Popup regression: existing behaviour of SA screen via its skeleton with a
  controller snapshot.

Manual (local, `#/desk?window_tutorial=migrate&screen=2`): Done goes live;
copy / paste / import / progress; folder refreshes on done; × and Escape end
the tour; popup still opens from + New and Settings. **Precondition to check
first:** whether local `google_drive.get_state` reports `sa: 1`; if not, only
the `unavailable` → popup fallback is click-testable here.

## 8. Risks

- Popup refactor regresses the SA screen → covered by the controller tests
  plus a manual pass of the popup.
- Stage `yp` is shared across endpoints (no server change here, so no proc
  arity risk).
- A live dialog holds the tour lock for as long as it is open; other
  contextual tours wait. Intended.
