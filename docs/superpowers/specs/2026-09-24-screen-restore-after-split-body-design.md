# Screen restore after the split body — design

Date: 2026-09-24
Status: design approved in conversation; spec awaiting review
Scope: `ui-team` (desk, window_folder, five screens) + a follow-up in `admin-dash-ui` (Apps)

## 1. Goal

On a page refresh, the desk puts back the screen the user was on — Activity,
Calendar, Inbox, Contacts, Trash, Apps (and Settings / Help / Upgrade plan) —
**only after** the workspace pane's split body (`.window-folder__split-body`)
has actually been shown, and the restored screen must come back **with its
items rendered** (or its empty / error state), not as an empty frame.

The current screen-restore logic is removed and replaced. Workspace and
floating-window restore are kept as they are.

### Success criteria

1. Refresh on each of the six screens → the workspace split body paints first,
   then the screen opens with its items (or its empty state) and its sidebar
   row lit.
2. No fixed-delay waits in the screen-restore path.
3. A screen whose first load did not paint within the timeout gets exactly one
   refresh.
4. A user click during the restore wins — the saved screen does not open over
   it.
5. Deep links still beat the saved screen.
6. Nothing in the restore can hang or throw into boot.

## 2. What exists today (and what changes)

Kept unchanged (`src/drumee/modules/desk/index.js`):

- `_persistDeskState` (pagehide → `sessionStorage["drumee.desk.lastScreen"]`),
  `_currentScreenService`, `_snapshotWorkspace`, `_snapshotFloatingWindows`.
- `_RESTORABLE_SCREENS` (service → sidebar `sys_pn`).
- `_readSavedDeskState`, `_savedStateIsRestorable`, `_hasDeepLink`.
- In `_restoreDeskState`: deep-link branch, `_restoreFloatingWindows`,
  `_restoreWorkspace` / `_openDefaultWorkspace`, `_clearRestoreInFlight`,
  `_settleHomeGrid`.

Removed:

- `_restoreSidebarService` (including its `toggle-activity` special case,
  which moves into the registry).
- The `await new Promise((r) => setTimeout(r, 300))` settle in
  `_restoreDeskState`.

Replaced by: the screen-restore sequence below (§3–§5).

## 3. Flow

```
_restoreDeskState
  ├─ floating windows       (unchanged)
  ├─ workspace / default    (unchanged)
  └─ screen restore         (NEW)
       1. await Wm.whenSplitBodyShown({ timeout: 8000 })
       2. user-navigation guard (see §5.4)
       3. registry[service].open()
       4. widget = await awaitScreenWidget(slot, kind, 5000)
       5. ok = await registry[service].ready(widget, 6000)
       6. if !ok → registry[service].refresh(widget)   (once)
       7. light the sidebar row (existing sidebar-radio broadcast)
```

The screen restore is started from the same place `_restoreSidebarService` was
called, still inside the `try` whose `finally` clears the restore flag and
settles the home grid.

## 4. The split-body signal (window_folder + Wm)

### 4.1 Emission — `src/drumee/builtins/window/folder/index.js`

In `switchView` (the one place `data-view` is stamped on the `folder-view`
part, i.e. the one place the split body becomes visible), the **first** time a
**headless** pane stamps it:

```js
if (this.mget(_a.headless) && !this._splitBodyShown) {
  this._splitBodyShown = 1;
  RADIO_BROADCAST.trigger("workspace:split-body-shown", this);
}
```

Floating (non-headless) folder windows never emit: their split body is not the
desk's.

### 4.2 Waiting — `Wm.whenSplitBodyShown({ timeout })` (desk/wm)

- Resolves `true` at once if `Wm.headlessPane()` exists, is not destroyed and
  has `_splitBodyShown`.
- Otherwise listens once for `workspace:split-body-shown` whose source is a
  headless pane → resolves `true`.
- Resolves `false` on timeout; always removes its listener.

Flag first, event second: a broadcast that already fired cannot be missed, and
the wait never depends on `ensurePart` (which never resolves for a part that
does not mount).

## 5. Screen restore

### 5.1 Items-ready contract — `src/drumee/libs/items-ready.js` (new)

```js
armItemsReady(widget)   // in initialize(): one-shot deferred + widget.whenItemsReady()
markItemsReady(widget)  // resolves it (idempotent), stamps el.dataset.itemsReady = "1"
```

Rule: a screen marks ready after its **first** load has **painted** — items,
empty state, or error state. A failed fetch is still "ready" (ready means "not
loading any more", not "has rows"), otherwise an empty screen would always time
out and trigger a pointless refresh.

Where each screen marks ready:

| Screen | Kind / file | Mark ready at |
|---|---|---|
| Activity | `panel_activity` — `builtins/panel/activity/index.js` | end of `refreshActivity()` after the list is fed, on both the rows and the empty path |
| Calendar | `calendar_main` — `builtins/panel/calendar/index.js` | in `onDomRefresh`, inside `_loadItems().then(() => { …; _render(); })` (also runs on a failed fetch, `rows = null`) |
| Inbox | `chat_p2p` — `builtins/widget/chat-p2p/index.js` | in the `contact-list` first-page `eod` handler, after `_applyFilter()`, inside the existing `armedScope` guard |
| Contacts | `address_book` — `builtins/widget/address-book/index.js` | in `onDomRefresh`, after `_refreshList()` |
| Trash | `panel_trash` — `builtins/panel/trash/index.js` | in the `list` part's `eod` handler, after `data-empty` and the count are stamped |
| Apps | `apps_main` — `@drumee/admin-console` plugin (`admin-dash-ui/src/widgets/apps-main`) | **now:** DOM fallback in the registry (§5.2). **follow-up:** plugin calls `markItemsReady` after its first post-load `_render()`; the registry prefers it when present |

Activity is a permanent part whose first load runs at boot, so it may already
be ready when the restore opens it. That is fine: the open keeps calling
`refreshFeed()` as today, and an already-resolved `whenItemsReady()` simply
does not wait.

### 5.2 Registry — `desk_module._SCREEN_RESTORE` (desk/index.js)

Keyed by the same service strings as `_RESTORABLE_SCREENS`.

| Service | Slot | Kind | Ready | Refresh (on ready timeout) |
|---|---|---|---|---|
| `toggle-activity` | `activity-panel` | `panel_activity` | `whenItemsReady()` | `refreshActivity()` |
| `toggle-calendar` | `settings-main-slot` | `calendar_main` | `whenItemsReady()` | `_loadItems().then(_render)` |
| `toggle-inbox` | `settings-main-slot` (`INBOX_SLOT`) | `chat_p2p` | `whenItemsReady()` | restart `contact-list` |
| `toggle-contacts` | `chat-panel` | `address_book` | `whenItemsReady()` | `_loadContacts()` + `_refreshList()` |
| `toggle-trash` | `trash-panel` | `panel_trash` | `whenItemsReady()` | restart its `list` part |
| `toggle-apps` | `settings-main-slot` | `apps_main` | `whenItemsReady()` if the plugin has it, else DOM fallback | none (warn) |
| `toggle-settings` | `settings-main-slot` | `settings_main` | ready on mount | none |
| `toggle-help` | `settings-main-slot` | `help_main` | ready on mount | none |
| `upgrade-plan` | `settings-main-slot` | `settings_billing` | ready on mount | none |

Apps DOM fallback: a `MutationObserver` on the widget element resolves when
`.apps__ui` contains `.apps__item` **or** the plugin's empty-state element. The
empty-state selector is **not yet verified** — the first Apps task of the plan
reads `admin-dash-ui/src/widgets/apps-main` to pin it before any code.

### 5.3 Opening and finding the widget

- **Open** = today's dispatch, `this.onUiEvent({ mget: () => null }, { service,
  intent: "restore" })`, so every side effect of a real press is kept
  (breadcrumb context, rail unlight, modal dismiss, Apps plugin load). The one
  exception is `toggle-activity`, whose live service is a true toggle: its
  current open-only block (`_dismissWmModal`, `_parkLiveCall`, `setState(1)`,
  `closeOtherSidebarPanels`, `refreshFeed`) moves into its registry entry.
  Trash and Contacts are toggles too; the registry skips the dispatch when the
  slot already holds a standing child of that kind, so a restore can never
  close a screen.
- **Find the widget** — `awaitScreenWidget(slot, kind, timeout)`: `togglePanel`
  settles when a kind is *fed*, not drawn, and these kinds are lazy `import()`
  chunks that paint a placeholder first. Poll the slot's `children` every
  100ms for a child that is not destroyed, has `mget(_a.kind) === kind`, and is
  the real widget (has `whenItemsReady`, or for Apps its element matches
  `.apps-main`). Resolves the widget or `null` on timeout.

### 5.4 User-navigation guard

The desk's `_navSeq` (bumped by `_navigated()`) is the signal:

1. Read `seq0 = this._navSeq` when the screen restore starts.
2. After the split-body wait: if `_navSeq !== seq0`, the user has already
   navigated → stop (no open, no refresh, no row).
3. The restore's own open goes through `togglePanel` → `_navigated` and bumps
   `_navSeq` itself, so re-read `seq1 = this._navSeq` **immediately after
   `open()` returns**, and from then on compare against `seq1`.
4. Before the refresh and before lighting the row: if `_navSeq !== seq1`, stop.

### 5.5 Timeouts and failure handling

| Wait | Limit | On timeout |
|---|---|---|
| split body shown | 8s | open anyway (never leave the user on a bare workspace) |
| widget mounted | 5s | warn, stop — nothing to refresh |
| items ready | 6s | `refresh()` once, then stop |

Every step is wrapped: an exception is logged with `this.warn("[restore] …")`
and ends the screen restore; it never propagates into `_restoreDeskState`'s
`finally`.

## 6. Code layout

- `src/drumee/libs/items-ready.js` — new, pure.
- `src/drumee/libs/screen-restore.js` — new, pure orchestration of §3 with every
  dependency injected: `whenSplitBodyShown`, `open`, `awaitWidget`, `ready`,
  `refresh`, `lightRow`, `navSeq()`, `warn`, and a clock/timeout helper.
- `src/drumee/modules/desk/index.js` — registry table + wiring; removes
  `_restoreSidebarService` and the 300ms sleep.
- `src/drumee/modules/desk/wm/index.js` — `whenSplitBodyShown`.
- `src/drumee/builtins/window/folder/index.js` — emission in `switchView`.
- Five screens — `armItemsReady` in `initialize`, `markItemsReady` at the point
  in §5.1.
- `admin-dash-ui/src/widgets/apps-main/index.js` — follow-up, separate PR.

## 7. Testing

Unit (`node --test`, repo convention — pure modules):

- `tests/items-ready.test.js`: resolves once; mark-before-wait still resolves a
  later wait; repeated marks are harmless; stamps `data-items-ready`.
- `tests/screen-restore.test.js`: happy path order (split body → open → ready →
  row); split-body timeout still opens; ready timeout → refresh exactly once;
  navigation before open → no open; navigation after open → no refresh, no row;
  own open bumping the counter does not cancel the restore; widget never mounts
  → warn and stop without throwing; unknown service → no-op.

Manual (local.drumee only — this box is not production):

- For Activity, Calendar, Inbox, Contacts, Trash: open → refresh → split body
  paints first, then the screen with items or empty state, sidebar row lit.
- Refresh, then press a rail item within ~1s → the saved screen does not open
  over it.
- A deep link beats the saved screen.

Known gap: the admin console is not deployed locally, so Apps cannot be
click-tested here. It is covered by the orchestration tests and by checking the
fallback selector against the plugin's real markup; the end-to-end refresh
check happens on stage once the plugin ships.

## 8. Out of scope

- Changing what is persisted, or moving persistence off `sessionStorage`.
- Workspace / floating-window restore.
- Restoring in-screen state (selected conversation, calendar range, trash
  page).
