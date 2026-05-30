# Routing Mechanism

**Date:** 2026-05-27
**Status:** Reference

---

## Overview

Hash-based routing drives all in-app navigation. The chain is:

```
location.hash change
  → window.onhashchange
    → drumee_router.route()
      → (if module unchanged) cm.route()   ← current module's own route()
        → (if hash contains /wm/) Wm.route()
```

Setting `location.hash` is sufficient to trigger navigation — no manual `route()` call is needed.

---

## Layer 1 — Top-level router (`router/index.js`)

`drumee_router` registers the hash listener in `initialize()`:

```js
this._boundRoute = this.route.bind(this);
window.onhashchange = this._boundRoute;
```

`drumee_router.route()` logic:

1. If `location.pathname` matches a static `.htm` page → `loadBootstrap()` (plugins entry point)
2. If the user is signed in but the hostname doesn't match the org → `changeHost()`
3. Extracts the module name via `moduleName()`
4. If the current module widget matches the name → calls `cm.route()` (no re-mount)
5. Otherwise → `loadModule()` (mounts the appropriate module widget)

`drumee_router` also calls `this.route()` directly from `onDomRefresh()` and `restart()`.

---

## Module resolution (`router/modules.js`)

`moduleName()` extracts the first path segment from the hash:

| Hash | Extracted name |
|------|---------------|
| `#@desk/...` | `desk` |
| `#/desk/...` | `desk` |
| `#/welcome/signin` | `welcome` |
| `#/plugins?name=...` | `plugins` |
| *(no hash, known domain)* | `desk` |

`getModule(name)` maps names to widget kinds:

| Name | Kind | Access |
|------|------|--------|
| `desk` | `module_desk` | private |
| `welcome` | `module_welcome` | public |
| `dmz` | `module_dmz` | public |
| `admin` | `module_admin` | private |
| `devel` | `module_devel` | public |
| `plugins` | `module_plugins` | public |
| `sandbox` | `module_sandbox` | public |

---

## Layer 2 — Desk module (`modules/desk/index.js`)

`Desk.route()` is called when the hash module is `desk` and the desk widget is already mounted:

```js
async route(opt) {
  let args = Visitor.parseModuleArgs();
  if (args.hasOwnProperty('wm') && window.Wm) {
    return window.Wm.route();           // delegate to window manager
  }
  // else: onboarding check → loadDefault()
}
```

The key condition is **`args.hasOwnProperty('wm')`**. `Visitor.parseModuleArgs()` splits the hash on `[#/&?]` and builds a key→value map, so any hash segment literally equal to `wm` satisfies this condition.

Hash `#/desk/wm/chat/?drumate_id=X` → args keys include `'desk'`, `'wm'`, `'chat'`, `'drumate_id'` → `Wm.route()` is called.

---

## Layer 3 — Window manager (`modules/desk/wm/index.js`)

`Wm.route()` reads the current hash via `Visitor.parseModule()` / `Visitor.parseModuleArgs()` and dispatches:

```js
route(l) {
  let args = Visitor.parseModuleArgs();   // key→value map
  let path = Visitor.parseModule();       // array of segments

  switch (path[2]) {
    case _a.chat:    Desk.openP2Pchat(args); return;
    case _a.channel: this.loadWorkspace(args); return;
    case _a.meeting: /* open meeting */; return;
    case _a.open:    this.openFileLocation(args); return;
  }

  // Fallback: saved location from localStorage
  const loc = JSON.parse(localStorage.getItem('locationOnStart'));
  if (loc?.hash) { this.openSharedLink(Visitor.parseModuleArgs(loc.hash)); }

  // Direct folder deep link (page-load only)
  if (path[1] === 'folder') {
    const params = Visitor.parseModuleArgs();
    if (params.hub_id) {
      Kind.waitFor('window_folder').then(() => {
        this.launch({ kind: 'window_folder', hub_id: params.hub_id, nid: params.nid }, { explicit: 1 });
      });
    }
  }
}
```

---

## Hash parsing (`Visitor.parseModule` / `Visitor.parseModuleArgs`)

Both live in `node_modules/@drumee/ui-core/letc/user.js` and split on the character class `[#/&?]`.

**`parseModule(hash?)`** — returns a flat array of segments (empty leading entries stripped):

```
#/desk/wm/chat/?drumate_id=X&ts=123
  → ['desk', 'wm', 'chat', '', 'drumate_id=X', 'ts=123']
```

**`parseModuleArgs(hash?)`** — returns a key→value object (each segment split on `=`):

```
#/desk/wm/chat/?drumate_id=X&ts=123
  → { desk: undefined, wm: undefined, chat: undefined, drumate_id: 'X', ts: '123' }
```

---

## Hash formats for in-app navigation

All in-app navigation targets must include `/wm/` as the second path segment so that `Desk.route()` delegates to `Wm.route()`.

| Target | Hash | Handler in `Wm.route()` |
|--------|------|------------------------|
| P2P chat | `#/desk/wm/chat/?drumate_id=UID[&message_id=MID]` | `Desk.openP2Pchat(args)` |
| Channel / workspace | `#/desk/wm/channel/?hub_id=HID[&nid=NID]` | `Wm.loadWorkspace(args)` |
| Meeting | `#/desk/wm/meeting/?nid=HID` | meeting open handler |
| File / folder location | `#/desk/wm/open/?hub_id=HID&nid=NID` | `Wm.openFileLocation(args)` |

The `#@desk/folder?hub_id=HID` format (no `/wm/`) is handled by the `path[1] === 'folder'` fallback inside `Wm.route()`. It is suited for page-load deep links (e.g. stored in `localStorage.locationOnStart`) because `Wm.route()` must already be reached by another path for the check to execute.

---

## Navigating from widgets

Set `location.hash` to the target URL. The router picks it up automatically via `window.onhashchange`.

```js
// Open a P2P chat
location.hash = `#/desk/wm/chat/?drumate_id=${drumate_id}`;

// Open a channel / team workspace
location.hash = `#/desk/wm/channel/?hub_id=${hub_id}`;

// Open a file/folder by location
location.hash = `#/desk/wm/open/?hub_id=${hub_id}&nid=${nid}`;
```

Do **not** call `Wm.route()` manually — the `window.onhashchange` handler in `router/index.js` triggers the full chain automatically.
