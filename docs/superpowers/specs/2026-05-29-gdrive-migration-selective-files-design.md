# GDrive Migration — Selective Folder/File Choice

**Date:** 2026-05-29
**Status:** Approved (design), pending implementation plan
**Area:** ui-team `migrate-gdrive-popup` + server-team `google_drive` service / gdrive importer

## Problem

The Google Drive migration popup only lets the user migrate from a single
`source_folder_id` (default `root`), entered as a raw Google folder ID in a text
field. There is no way to migrate a chosen subset of folders/files. We want the
`ready` screen to offer two modes: **migrate everything** (current behavior) or
**choose specific folders and files** via an in-app lazy-loaded folder tree.

## Decisions (locked during brainstorming)

1. **Selection mechanism:** in-app folder tree (lazy-loaded via a new server
   endpoint). No Google Picker API, no external `gapi` script, no API key.
2. **Selection model:** folders + files, **explicit picks, no tri-state**.
   Checking a folder migrates its **whole subtree**; checking a file migrates
   that single file. To pick a subset of a folder, expand it and check
   individual children instead of the parent.
3. **Mode layout:** remove the manual `source_folder_id` text input. Add a
   radio: **Migrate everything** (default, no tree load) vs **Choose folders &
   files** (shows the tree).
4. **Shared Drives:** the existing "Include Shared Drives" toggle applies only
   to *Migrate everything*. In *Choose* mode the tree lists **My Drive only**.

## Architecture

Three tiers change: a new read endpoint to browse Drive, an extended
`start_migration` + queue payload, and an importer branch that migrates an
explicit selection set. The FE popup gains tree state + a mode radio.

### 1. Server — new endpoint `google_drive.list`

`service/private/google_drive.js`

```
async list() {
  const folder_id  = this.input.use('folder_id', 'root');
  const page_token = this.input.use('page_token', null);
  const token = await this.ensureFreshToken('google');   // inherited from ExtImport
  // GET drive/v3/files
  //   q = `'${folder_id}' in parents and trashed = false`
  //   fields = 'nextPageToken, files(id, name, mimeType, size, modifiedTime)'
  //   pageToken = page_token, pageSize = 200
  // → { files: [{ id, name, is_folder, mime_type, size }], next_page_token }
}
```

- `is_folder = mimeType === 'application/vnd.google-apps.folder'`.
- Sort folders first, then files, alphabetical by name.
- My Drive only — no `allDrives`/`supportsAllDrives` (Shared Drives is an
  All-mode concern only).
- Same query shape as the importer's `_listFolder` for consistency.
- Token failure surfaces `NEEDS_RECONNECT`; the FE drops back to the connect
  screen.
- Reuses `ExtImport.ensureFreshToken('google')` — no new token-refresh logic.

### 2. Server — `start_migration`, queue, ACL

`service/private/google_drive.js` `start_migration`:

- New inputs: `mode` (`'all'` | `'selected'`, default `'all'`) and `selections`
  (JSON `{ folder_ids: string[], file_ids: string[] }`).
- `mode === 'all'`: unchanged (uses `source_folder_id` + `include_shared_drives`).
- `mode === 'selected'`: validate `selections` non-empty (else throw
  `NOTHING_SELECTED`); ignore `source_folder_id` / `include_shared_drives`.
- Keep the existing destination write-access gate on `nid` and the
  in-flight-job dedup guard.

`offline/queues/migrationQueue.js` `addMigration`:

- Add `mode` and `selections` to **both** the options destructure **and** the
  `migrationQueue.add('migrate_google_drive', { ... })` payload. The function
  currently whitelists fields explicitly, so unlisted fields are dropped.

`acl/google_drive.json`:

- Add a `list` service (scope `hub`, `permission.src = owner`, params
  `folder_id` optional default `root`, `page_token` optional).
- Extend `start_migration` params with `mode` (string, default `all`) and
  `selections` (object/string, optional).

### 3. Importer — `selected` mode

`offline/workers/gdrive/importer.js` `run()`:

- `mode` absent or `'all'` → current behavior (`_traverse` from
  `source_folder_id`). **Backward-compatible** with already-queued jobs.
- `mode === 'selected'`:
  - For each `folder_id`: `meta = _getMeta(id)` →
    `sub = _createFolder(meta.name, rootFolder, hubDb, user_id)` →
    `_traverse({ folderId: id, destFolder: sub, ... })`.
  - For each `file_id`: `meta = _getMeta(id)` →
    `_importItem(meta, { destFolder: rootFolder, ... })`.
- Add `_getMeta(id)`: `GET files/${id}?fields=id,name,mimeType,size`. The server
  fetches metadata itself — it does **not** trust client-supplied names.
- Everything still lands under the `GoogleDriveMigration` folder. Cancellation,
  progress batching, and conflict-`skip` behavior are unchanged.
- Counting: `total_files`/`total_folders` accrue via `_traverse` for selected
  folders; standalone selected files increment `processedFiles`/`totalFiles`
  directly.

### 4. FE — popup state machine

`src/drumee/builtins/widget/migrate-gdrive-popup/index.js`

Instance state (survives the re-render cycle, like `_includeShared`):

- `_migrateMode = 'all'`
- `_treeCache = {}` — `folderId → { items: [...], next_page_token }` so
  expand/collapse never re-fetches.
- `_expanded = new Set()`, `_checkedFolders = new Set()`,
  `_checkedFiles = new Set()`, `_loading = new Set()`
- Remove `_sourceFolderId` and `_wireFormSync` (no folder-ID input anymore).

`onUiEvent` additions:

- `gdrive-mode` (`all` | `selected`) — set `_migrateMode`; first entry into
  `selected` with no `_treeCache.root` triggers `list('root')`; re-render.
- `gdrive-tree-expand` (folderId) — toggle `_expanded`; if uncached add to
  `_loading`, fetch `google_drive.list`, cache, re-render the tree region.
- `gdrive-tree-check` (id, isFolder) — toggle membership in the matching set;
  re-render the tree region.
- `gdrive-tree-more` (folderId) — fetch the next page using the cached
  `next_page_token`, append to cache, re-render.

`_getInputs()` additionally returns `{ mode, selections: { folder_ids, file_ids } }`;
`_startMigration` sends them. Tree re-render is scoped:
`this.ensurePart('gdrive-tree').then(p => p.feed(buildTree(this)))` — only the
tree subtree is rebuilt, not the whole popup.

### 5. FE — skeleton

`src/drumee/builtins/widget/migrate-gdrive-popup/skeleton/index.js`

In the `state === 'ready'` branch, replace the folder-ID field block with:

- Two radios (`Button.Label` + `radio`/`initialState`, the existing checkbox
  pattern): **Migrate everything** / **Choose folders & files**.
- The Shared Drives toggle renders only when `mode === 'all'`.
- When `mode === 'selected'`, a scrollable container `sys_pn: 'gdrive-tree'`
  (`List.Scroll`/`Box.Y`) holding `buildTree(ui)`:
  - Each row: expand caret (folders), checkbox (`Button.Label`), folder/file
    icon, name, optional size.
  - Recursively reads `_treeCache` / `_expanded`. A loading folder shows a
    spinner row; an empty folder shows "No items"; a folder with more pages
    shows a "Load more" row.
- **Start** button is disabled when `mode === 'selected'` and nothing is checked
  (`dataset.disabled` + drop `service`, per CLAUDE.md conditional-disable).

### 6. Locale + SCSS

- `locale/en.json` (and sibling locale files): `MIGRATE_GDRIVE_MODE_ALL`,
  `MIGRATE_GDRIVE_MODE_SELECTED`, `MIGRATE_GDRIVE_TREE_EMPTY`,
  `MIGRATE_GDRIVE_TREE_LOADING`, `MIGRATE_GDRIVE_LOAD_MORE`,
  `MIGRATE_GDRIVE_NOTHING_SELECTED`, plus an "included via parent" note string.
- `migrate-gdrive-popup/skin/index.scss`: `__tree`, `__tree-row`
  (depth-based indent), `__tree-caret`, `__tree-check`, `__tree-ico`,
  `__tree-more`, scroll area max-height.

## Selection UX rules (no tri-state) + edge cases

- Checking a folder includes its whole subtree. Expanding an already-checked
  folder shows its children **greyed/disabled** with an "included via parent"
  note — to pick a subset, uncheck the parent first. This keeps the
  explicit-picks model unambiguous without include/exclude sets.
- `selected` mode with nothing checked → Start disabled.

## Error handling, pagination, backward compatibility

- `list` failure → an error row with retry; token expiry → `NEEDS_RECONNECT` →
  connect screen.
- Large folders paginate with an explicit "Load more" row (bounds payload).
- Jobs without `mode` run the `all` branch — no breakage for in-flight jobs.

## Out of scope (YAGNI)

- Shared Drives / "Shared with me" inside the tree.
- Tri-state checkboxes and per-folder include/exclude subsets.
- Picking individual files inside a folder that is already wholly checked.
- Conflict policies other than `skip` (overwrite/rename remain Phase 2).

## Files touched

- Server: `service/private/google_drive.js`, `offline/workers/gdrive/importer.js`,
  `offline/queues/migrationQueue.js`, `acl/google_drive.json`
- FE: `migrate-gdrive-popup/index.js`, `migrate-gdrive-popup/skeleton/index.js`,
  `migrate-gdrive-popup/skin/index.scss`, `locale/en.json` (+ other locales)
- Docs: `docs/gdrive-migration-workflow.md`
