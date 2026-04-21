# Drumee Frontend SDK — General Principles

> Source: https://drumee.github.io/api-reference/frontend-sdk/

---

## 1. Core Philosophy

Drumee uses a **Skeleton-based UI model** — all UI is expressed as component trees built with the `Skeletons` API. Never write raw HTML. A widget feeds a skeleton into itself; the framework handles DOM creation.

The entire application is built on Backbone.js/Marionette. Every widget is a view that can host children (parts), receive events, and call backend services.

---

## 2. Widget Lifecycle

### `onDomRefresh()`
Fires **once** after the widget's DOM element is mounted but before children render. Use it as the initialization entry point.

```javascript
onDomRefresh() {
  this.feed(require("./skeleton").default(this));
}
```

For async data loading, `await` before feeding:
```javascript
async onDomRefresh() {
  await this.loadEnv();
  this.feed(require("./skeleton").default(this));
}
```

---

## 3. Rendering Content into Parts

### `feed(c)` — replace all children
Primary rendering method. Completely replaces current children with new content.

```javascript
part.feed(Skeletons.Note("Hello"));
part.feed([SkeletonA, SkeletonB]);
part.feed((ui) => Skeletons.Box.Y({ kids: [...] }));
part.feed(null); // no-op
```

### `append(c, index?)` — add at end or position
Inserts without replacing existing children.

```javascript
part.append(Skeletons.Note("New item"));
part.append(Skeletons.Note("At top"), 0);
this.ensurePart("my-list").then((list) => list.append(item));
```

### `prepend(c)` — add at beginning
Equivalent to `append(c, 0)`.

```javascript
list.prepend(Skeletons.Note("Pinned item"));
```

**Rule:** Use `ensurePart("name")` before calling `append`/`prepend` on a named part to ensure it exists.

---

## 4. Event System

Two independent event channels handle all widget communication.

### 4.1 Interaction events: `service` + `uiHandler` → `onUiEvent`

`service` names the action; `uiHandler` (always an array) routes it to the widget.

```javascript
// Skeleton
Skeletons.Button.Svg({ ico: "save", service: "save-doc", uiHandler: [ui] });

// Widget
async onUiEvent(cmd, args = {}) {
  const service = args.service || cmd.get(_a.service);
  switch (service) {
    case "save-doc":
      const data = cmd.mget("my_param"); // extra skeleton props
      await this.postService(SERVICE.my_module.save, { data });
      break;
  }
}
```

**Rules:**
- `service` without `uiHandler` → event never fires
- Multiple handlers allowed: `uiHandler: [ui, parentUi]`
- Extra skeleton props are accessible via `cmd.mget("prop_name")`

### 4.2 Lifecycle events: `sys_pn` + `partHandler` → `onPartReady`

`sys_pn` names a part; `partHandler` routes the mount callback.

```javascript
// Skeleton
Skeletons.Box.Y({ sys_pn: "content", partHandler: ui });

// Widget
onPartReady(child, pn) {
  switch (pn) {
    case "content":
      child.feed(require("./skeleton/my-page").default(this));
      break;
    case "video":
      child.el.volume = 0.5; // direct DOM access
      break;
    default:
      super.onPartReady(child, pn); // always delegate unhandled cases
  }
}
```

**Rules:**
- `sys_pn` without `partHandler` → `onPartReady` never fires (but `ensurePart` still works)
- Always call `super.onPartReady(child, pn)` in the `default` case
- Dynamic names work: `` `item-action:${item.id}` `` for per-item access

---

## 5. Backend Communication

### `fetchService(service, payload)` — GET
Read data from the server. Automatically injects `socket_id`, `device_id`, and auth headers. Strips UI-only fields before sending.

```javascript
const data = await this.fetchService(SERVICE.my_module.get_data, { uid });
// or object form:
const data = await this.fetchService({ service: SERVICE.my_module.get_data, uid });
```

### `postService(service, payload)` — POST
Mutate data on the server. Same automatic injections as `fetchService`.

```javascript
await this.postService(SERVICE.my_module.save, { uid, ...payload });
```

**Best practices for both:**
- Guard with required values before calling
- Wrap in `try/catch` and re-throw errors
- Cache `fetchService` results to avoid redundant requests
- Use optimistic UI updates for `postService` calls

---

## 6. Media File System (MFS)

MFS widgets extend `DrumeeMFS` (not `LetcBox`). They represent filesystem nodes: files, folders, hubs.

### Initialization

```javascript
// Called after model data is available
this.model.set(data);
this.initData();  // sets isMfs, isHub, isFolder, isHubOrFolder flags; computes sizes/dates
this.initURL();

// unselect() must be implemented by subclasses
unselect(mode) {
  this.setState(0);
  this.el.removeAttribute("data-selected");
}
```

### Node identity

| Method | Returns | Description |
|--------|---------|-------------|
| `getCurrentNid()` | number | Container nid: folder→own id, hub→0, file→parent id |
| `getHostName()` | string | Virtual hostname (e.g. `files.drumee.com`) |
| `getHostId()` | string | Hub ID owning the node |
| `isRegularFile()` | boolean | Not hub/folder and not symlink |
| `isSymLink()` | boolean | Symlink flag AND not a hub |

### URL generation

| Method | Async | Use case |
|--------|-------|---------|
| `url(format?)` | No | Display URL (thumbnail or original) |
| `directUrl()` | No | Raw file href; `null` for non-regular files |
| `srcUrl()` | No | Full URL for `src=` attributes |
| `viewerLink(format?, e?)` | **Yes** | Shareable desk viewer URL |
| `pluginUrl()` | No | Plugin endpoint URL |

### File download

```javascript
this.download({});                              // auto-detects file vs hub/folder
this.download_zip({ zipid, zipname, progress }); // pre-built zip
await this.fetchFile({ url, download: "file.pdf", progress: widget }); // stream
this.abortDownload();                            // cancel in-flight
```

### Metadata

```javascript
// metadata() — auto-called by initData(); flattens md5Hash, dataType onto model
metadata() {
  const md = super.metadata();
  const { customField } = md;
  this.mset({ customField });
  return md;
}

this.fullname(); // → "filename.ext"
this.copyPropertiesFrom(srcNode); // clone filesystem properties
```

### Permissions

Based on a bitmask in the node's `privilege` field.

```javascript
if (this.canUpload())       { /* show upload button */ }
if (this.canRemove())       { /* show delete option */ }
if (this.canShare())        { /* show share button  */ }
if (this.canManageAccess()) { /* show access panel  */ }
if (this.isMediaOwner())    { /* owner-only actions */ }
```

| Method | Permission bit | Guard |
|--------|---------------|-------|
| `isMediaOwner()` | owner | — |
| `canAdmin()` | admin | — |
| `canOrganize()` | modify | Blocks non-hub symlinks |
| `canUpload()` | write | Blocks non-hub symlinks |
| `canShare()` | download | Area must be `dmz` or `share` |
| `canManageAccess()` | admin | Area must be `private` |
| `canRemove()` | modify | Blocks locked nodes |
| `canDownload()` | download | — |

---

## 7. Skeleton Component Reference

### Layout — `Skeletons.Box`

| Variant | Direction | Use case |
|---------|-----------|---------|
| `Box.Y` | column | Vertical stacks |
| `Box.X` | row | Toolbars, horizontal rows |
| `Box.G` | grid | Grid layouts |
| `Box.Z` | absolute | Overlays |

**Never add `display: flex` or `flex-direction` in SCSS for Box elements — the framework sets these.**

Key props: `kids`, `kidsOpt` (shared options for all children), `populate` (generate from data array), `sys_pn`, `uiHandler`, `partHandler`.

```javascript
Skeletons.Box.X({
  className: `${pfx}__toolbar`,
  kids: [
    Skeletons.Button.Svg({ ico: "save", service: "save", uiHandler: [ui] }),
    Skeletons.Button.Svg({ ico: "close", service: "close", uiHandler: [ui] }),
  ],
});
```

### Buttons — `Skeletons.Button`

| Variant | Renders | Use case |
|---------|---------|---------|
| `Button.Svg` | Icon only | Toolbars, compact actions |
| `Button.Label` | Icon + text | Menus, nav, checkboxes |
| `Button.Icon` | Icon (custom size) | Non-standard dimensions |

All require `ico` (kebab-case SVG name). Common props: `service`, `uiHandler`, `state`, `radio`, `tooltips`, `haptic`, `dataset`.

```javascript
Skeletons.Button.Svg({ ico: "arrow-right", service: "next", uiHandler: [ui] });
Skeletons.Button.Label({ ico: "user", label: LOCALE.PROFILE, href: "#/profile" });
Skeletons.Button.Icon({ ico: "logo" }, { width: 48, height: 48, padding: 8 });
```

### Text — `Skeletons.Note`
Lightest primitive. For inline text, labels, clickable notes.

```javascript
Skeletons.Note("Hello World");
Skeletons.Note("Loading...", "spinner-class"); // shorthand: (content, className)
Skeletons.Note({ className: `${pfx}__label`, content: LOCALE.MY_TEXT, service: "click", uiHandler: [ui] });
```

### Inputs — `Skeletons.Entry` / `Skeletons.EntryBox`

`Entry` — basic single-line input. `EntryBox` — extends Entry with validators, inline error display, prefix icon, and password toggle.

```javascript
// Entry
Skeletons.Entry({
  placeholder: LOCALE.EMAIL, require: "email",
  mode: "commit", service: "submit", uiHandler: [ui],
});

// EntryBox — for forms with validation feedback
Skeletons.EntryBox({
  placeholder: LOCALE.EMAIL, require: "email",
  shower: 0, validators: myValidators, showError: true,
  formItem: "email", interactive: 1, preselect: 1,
  mode: "commit", service: "submit",
  uiHandler: [ui], errorHandler: ui,
});
```

### Lists — `Skeletons.List`

| Variant | Use case |
|---------|---------|
| `List.Smart` | API-driven, with spinner + empty state |
| `List.Scroll` | Static scrollable container |
| `List.Table` | Tabular data |

```javascript
Skeletons.List.Smart({
  className: `${pfx}__list`, sys_pn: "items",
  api: ui.getItems.bind(ui),
  itemsOpt: { kind: "my_item_widget", uiHandler: [ui] },
  spinner: true, spinnerWait: 500,
  evArgs: Skeletons.Note(LOCALE.NO_ITEMS, "no-content"),
  vendorOpt: Preset.List.Orange_e,
});
```

### Other components

| Component | Purpose |
|-----------|---------|
| `Skeletons.Textarea` | Multi-line input |
| `Skeletons.Messenger` | Chat input (auto-clear, auto-focus, upload) |
| `Skeletons.RichText` | Rich text editor/viewer |
| `Skeletons.Avatar` | User avatar (image or color-generated) |
| `Skeletons.UserProfile` | Drumee user profile with online indicator |
| `Skeletons.Profile` | Generic entity profile |
| `Skeletons.Image.Smart` | Photos/covers with low/high res |
| `Skeletons.Image.Svg` | Non-interactive SVG icon |
| `Skeletons.Progress` | Upload/download progress bar |
| `Skeletons.FileSelector` | Native file picker |
| `Skeletons.Wrapper.X/Y` | Dialog/overlay container |
| `Skeletons.Element` | Generic DOM element (img, video, source) |

---

## 8. Socket / HTTP Utilities

### `xhRequest(url, opt?)`
Low-level GET via XHR. Service paths (e.g., `"media.get_node_attr"`) are auto-prefixed with the bootstrap `svc` URL.

```javascript
xhRequest(fileUrl, { responseType: "text" }).then((text) => this.load(text));
xhRequest("my_module.get_data", { uid }).then((data) => { this._data = data; });
```

### `uploadFile(file, params)`
Binary upload via XHR. Returns the XHR instance (call `.abort()` to cancel). Metadata is encoded in the `x-param-xia-data` header.

```javascript
const xhr = this.uploadFile(file, { hub_id: this.getHostId(), nid: this.getCurrentNid() });
// Hooks auto-bound on widget: onUploadProgress, onUploadError, onLoad, onAbort, onUploadEnd
```

### Drag-and-drop uploads

```javascript
sendTo(targetWidget, dropEvent, params, token);  // public entry point
// → internally wraps files in pseudo_media → calls target.insertMedia()
```

---

## 9. CSS Naming Convention

Widget class name → `fig` object:

```
class __chat_hub  →  fig.family = "chat-hub",  fig.group = "chat",  fig.name = "hub"
```

Use `fig.family` as the BEM root in skeletons:

```javascript
const pfx = ui.fig.family; // e.g. "chat-hub"

Skeletons.Box.Y({
  className: `${pfx}__container`,
  kids: [
    Skeletons.Note({ className: `${pfx}__title`, content: ui.mget(_a.name) }),
  ],
});
```

| Level | Suffix convention |
|-------|-------------------|
| Outer box (contains only boxes) | `__container`, `__wrapper` |
| Middle box (mixed children) | `__section`, `__group` |
| Inner box (contains only leaves) | `__content`, `__inner`, `__row`, `__line` |

---

## 10. Key Rules at a Glance

| Rule | Reason |
|------|--------|
| Never write HTML — use Skeletons | Framework manages DOM |
| Never hardcode text — use `LOCALE.*` | i18n |
| `uiHandler` always as array: `[ui]` | Supports multiple handlers |
| Always `super.onPartReady()` in `default` | Delegates to parent class |
| Extend `LetcBox` for standard widgets | Extend `DrumeeMFS` only for filesystem nodes |
| Never add `flex`/`flex-direction` in SCSS for Box elements | Framework sets these |
| Use `ensurePart()` before `append`/`prepend` | Guarantees part exists |
| Use `RADIO_BROADCAST` for app-wide events | Standard event bus |

---

## 11. Example — Scaffolding a New Widget

### 1. Create and initialize the project

```bash
mkdir my-drumee-widget
npm init my-drumee-widget
cd my-drumee-widget
```

### 2. Install the dev tools

```bash
npm i @drumee/ui-dev-tools
```

### 3. Scaffold the widget

```bash
npm run add-widget -- --fig=widget.example --dest src/widget/example
```

`--fig` sets the widget's `fig` identity (`group=widget`, `family=widget-example`), which becomes the BEM root for all CSS class names. `--dest` is the output directory where the scaffold files are generated.
