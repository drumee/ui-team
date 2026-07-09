# Topbar search: open host folder + highlight the hit

**Date:** 2026-07-08
**Status:** Approved for implementation

## Problem

Clicking a topbar search suggestion currently fires the `load-workspace`
service, which opens the *containing hub* in the in-place headless grid and
never reveals the actual hit. A user who searches for a file, clicks it, and
lands on a hub root still has to hunt for the file by hand.

Desired: clicking a result navigates to the folder that **hosts** the hit and
**highlights** it — the same experience as clicking a notification
(scroll-into-view + flash + soft-highlight).

## Reference flow (already exists)

`Wm.openFileLocation(source)` in `builtins/window/utils.js`:

- resolves the hit's parent folder via `pid`, opens it as a `window_folder`;
- `_revealFromNotification(nid, filetype)` → `_highlightNode(nid)` (single file)
  or `_highlightFolderNewFiles(nid)` (folder/hub), which poll for the grid cell
  and apply `scrollIntoView` + a 2.4 s `media-highlight` flash + a persistent
  soft-highlight via `_setNotifyHighlight`.

Search rows from `desk_search` (→ `media_index`) already carry
`nid, hub_id, pid, filetype, area, result_type` — everything that call needs.

## Design

### Dispatch (files & folders)

- `modules/desk/skeleton/topbar.js`: the suggestions-list `itemsOpt.service`
  changes from `"load-workspace"` to a dedicated `"open-search-hit"`. This
  isolates the topbar behavior from the sidebar's `load-workspace` /
  `load-folder`.
- `modules/desk/index.js` `onUiEvent`: new `case "open-search-hit"`:
  - hide suggestions;
  - `result_type === "message"` → `_openMessageHit(data)` (below);
  - otherwise `Wm.openFileLocation({ ...data, highlight: 1 })` after
    `closeAllPanels()`.

No server change for files/folders — the rows already carry `pid`/`filetype`.

### Messages

Message rows (`channel_search`) return only
`message_id (AS id), author_id, ctime, preview` (+ `hub_id`, `result_type`
tagged by the service). They carry no chat scope.

- **SQL** `common/procedures/channel/channel_search.sql`: also select
  `thread_id` and `file_thread_id` so the client can resolve the chat scope.
  Requires patching all `hub` instances.
- **Server** `service/private/desk.js`: already spreads the SP row and tags
  `hub_id`/`result_type` — new columns flow through automatically.
- **Rendering** `modules/desk/workspace-item/skeleton/index.js`: message rows
  have no `filename` — fall back to `preview` for the row label and use a
  chat/message icon.
- **Navigation** `modules/desk/index.js` `_openMessageHit(data)`: open the
  hosting hub as a `window_folder`; when `file_thread_id` resolves to a file
  thread, launch scoped to that file (reuse the existing launch-time
  `scopedFileNid` path in `folder/index.js`); pass a launch-time
  `jumpMessageId` so the folder chat scrolls to the message once loaded
  (reuse the `getItemsByAttr("message_id") → scrollIntoView` pattern from
  `_jumpToSearchResult`). **Best-effort:** a message outside the loaded chat
  page just opens the scoped conversation without an exact scroll — the same
  limitation the in-folder chat search already has.

## Phasing

- **Phase A** — files + folders (dispatch change, no server work). Small,
  self-contained, delivers the core ask.
- **Phase B** — messages (SQL + rendering + navigation). Depends on the SQL
  patch reaching hub instances; message auto-scroll is best-effort.

## Verification notes

- Files/folders: exercised via the topbar search on a local hub.
- Messages: cross-hub message search is not provisioned on the local box; the
  SQL change ships as a patch and message navigation is verified on an
  environment with chat data.
