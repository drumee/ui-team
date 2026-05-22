# Multi-Folder Windows for Workspace (Restrict / Share)

**Date:** 2026-05-22
**Branch (target):** `fix/multi-folder-windows` (to be created off `preview`)
**Status:** Draft

---

## Problem

Right-clicking a folder item whose `filetype === "hub"` (any workspace —
private, restricted, share, team) and choosing **Open in Window** is
supposed to mount a popup `window_folder` for that hub. Today only one
`window_folder` can exist at a time: opening a popup for hub B while a
popup for hub A is already on screen just raises the A window. The B
window never appears.

The same single-instance behaviour also collides between the *headless
workspace* (the full-area workspace pane mounted when a user clicks a
workspace in the sidebar) and the popup *Open in Window* flow, because
both target the same `wm_unique_id` (`window_folder-${hub_id}`).

## Root Cause

`window/manager.js` → `launch(arg, o)` (line 1080):

```js
if (o.singleton) {
  let w = this.getItemsByKind(arg.kind)[0];   // any window of this kind
  if (w && o.unique) {
    w = this.getItemsByAttr(o.unique.key, o.unique.value)[0];
  }
  if (w && !w.isDestroyed()) { /* raise, return */ }
}
```

Callers consistently set `arg.wm_unique_id` (e.g. `window_folder-${hub_id}`)
but rarely pass the matching `o.unique = { key, value }`. The singleton
check therefore degrades to a kind-only check and the first window of
that kind wins.

`media/interact.js:680` (right-click "Open in Window") and `:874`
("Get info") both hit this path. `wm/index.js:278` (headless workspace
mount) sets the same `wm_unique_id` prefix as the popup path, which
makes them indistinguishable to a corrected singleton filter as well.

## Goals

1. Allow one popup `window_folder` per *distinct hub*.
2. Same hub right-clicked twice → raise the existing popup (no
   duplicate).
3. Headless workspace (sidebar-driven, full-area) and popup folder
   window (right-click, draggable) coexist independently — opening a
   popup for the currently-viewed workspace does not raise the
   headless pane, and vice-versa.
4. No regression for other singletons that rely on kind-only matching
   (support ticket, pricing, etc.).

## Non-Goals

- Changing the "Open in Window" UX itself (no new menu items, no new
  affordance for "open in new window vs. raise").
- Refactoring `window/team/index.js`'s explicit `unique:{key,value}`
  pass (it continues to work; later cleanup is optional).
- Splitting the popup flow per-hub-type. The fix applies uniformly to
  every workspace type — restrict, share, team, private, website.

## Design (Approach C)

Two surgical changes.

### 1. `launch()` auto-detects `wm_unique_id`

`src/drumee/builtins/window/manager.js`, inside `launch(arg, o)`:

```js
if (o.singleton) {
  let w;
  const uniqueKey = o.unique
    ? o.unique
    : (arg && arg.wm_unique_id
        ? { key: 'wm_unique_id', value: arg.wm_unique_id }
        : null);
  if (uniqueKey) {
    w = this.getItemsByAttr(uniqueKey.key, uniqueKey.value)[0];
  } else {
    w = this.getItemsByKind(arg.kind)[0];  // legacy fallback
  }
  if (w && !w.isDestroyed()) {
    const f = () => {
      if (_.isFunction(w.wake) && w.mget(_a.minimize)) return w.wake(arg.source);
      w.raise();
    };
    setTimeout(f, 100);
    return false;
  }
}
```

**Semantics:** `singleton` still means "max one instance per unique
key". The unique key is now derived from, in order:
- explicit `o.unique` (current API, e.g. `team/index.js:95`);
- `arg.wm_unique_id` (most callers set this);
- fallback to `arg.kind` alone (legacy kind-only singletons).

Backward-compatible: callers that previously set `wm_unique_id` but
not `o.unique` now get the per-key filtering they always intended;
callers that set neither continue to behave as before.

### 2. Distinct prefix for headless workspace

`src/drumee/modules/desk/wm/index.js`, line 278 (inside `loadWorkspace`'s
`apply` callback):

```js
// before
wm_unique_id: `window_folder-${hub_id}`,
// after
wm_unique_id: `workspace-${hub_id}`,
```

The headless workspace (sidebar-click flow) and the popup folder window
(right-click flow) now live in separate `wm_unique_id` namespaces, so
opening a popup for the currently-viewed workspace does not collide
with its headless mount.

## Files Touched

| File | Change |
|---|---|
| `src/drumee/builtins/window/manager.js` | `launch()` derives unique key from `wm_unique_id` when present |
| `src/drumee/modules/desk/wm/index.js` | Headless `wm_unique_id` prefix → `workspace-${hub_id}` |

Untouched (already set `wm_unique_id` correctly, benefit automatically):
- `src/drumee/builtins/media/interact.js:680, 874` (right-click flows)
- `src/drumee/builtins/widget/chat-item/index.js:456`
- `src/drumee/builtins/window/folder/index.js:539`
- `src/drumee/builtins/window/team/index.js:90` (explicit `unique:` keeps working)

## Data Flow After Fix

```
Right-click hub B "Open in Window"
  └─ media/interact.js:675 case "open-in-window"
       item.wm_unique_id = "window_folder-{B.hub_id}"
       Wm.launch(item, { explicit: 1, singleton: 1 })
         └─ launch() picks uniqueKey from arg.wm_unique_id
              getItemsByAttr("wm_unique_id", "window_folder-{B.hub_id}")
                ├─ match (popup B exists) → raise, return false
                └─ no match → windowsLayer.append(item) → new popup
```

Headless workspace A (`workspace-{A.hub_id}`) is in a separate pool
from popup A (`window_folder-{A.hub_id}`) and popup B
(`window_folder-{B.hub_id}`). All three can coexist.

## Edge Cases

| Case | Result |
|---|---|
| Headless A visible, right-click hub B → "Open in Window" | Popup B opens ✓ |
| Popup B already up, right-click hub B again | Existing popup B raised ✓ |
| Popup B up, right-click hub C | Popup C opens (popup B stays) ✓ |
| Headless A visible, right-click a folder belonging to hub A | Popup A opens (separate from headless) ✓ |
| Sidebar workspace switch A → D | Old headless suppressed; new headless `workspace-{D}` mounts ✓ |
| Singletons without `wm_unique_id` (support ticket, pricing) | Fallback to kind-only check, unchanged ✓ |
| `team/index.js` explicit `o.unique` pass | Still wins because `o.unique` is checked first ✓ |

## Risks

- **Kind-only singleton regressions.** Some legacy singletons may rely
  on "raise any window of this kind". The fallback branch preserves
  that, but any caller that sets `wm_unique_id` *and* expects the old
  kind-only semantic will switch behaviour. Audit: grep for
  `wm_unique_id` (8 hits, all desk/folder/chat — all want per-key
  semantics).

- **Stale `wm_unique_id` from suppressed windows.** `loadWorkspace`
  calls `suppress()` on the previous workspace widget before mounting
  the next; `isDestroyed()` should return true so the singleton check
  skips it. Verify in step 4 of the plan that switching workspaces
  rapidly does not raise a suppressed-but-not-destroyed pane.

## Testing

Drumee has no test runner (project CLAUDE.md). Verification is manual
on the dev server.

1. Boot `npm run dev`, log in.
2. Sidebar → workspace **A** → headless mounts (full-area, no title bar).
3. Right-click any folder/hub item of workspace **B** in the file grid →
   "Open in Window" → popup window appears, draggable, with title bar.
4. Right-click a folder/hub of workspace **C** → second popup appears
   alongside B.
5. Right-click **B** again → existing popup B raises to top; no
   duplicate window.
6. Inside headless A's file grid, right-click an entry that resolves
   to workspace A itself → popup A opens (separate from the headless).
7. Open browser DevTools → `Wm.getItemsByAttr('wm_unique_id',
   'window_folder-<B.hub_id>')` → returns exactly one widget.
8. Switch sidebar from A to D quickly → old headless suppressed, new
   one mounts; popups B/C unaffected.

## Rollout

- New branch `fix/multi-folder-windows` off `preview`. **Do not** work
  on `feature/share-screen`.
- No DB / server changes, UI-only.
- Bundle rebuild + `pm2 restart vudangnt` required (endpoint caches
  bundle manifest at startup — see [[project_deployment]]).
- Safe to ship behind no flag: the change is strictly additive for
  callers that already set `wm_unique_id`, fallback-equivalent for
  others.
