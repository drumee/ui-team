# DMZ Share — "Add new" Folder Creation Design

**Goal:** Restore the "Add new" control in the DMZ share page as a **Folder-only**
menu, shown only when the guest's access role grants write permission, and
implement folder creation in the shared folder.

**Status:** Approved design — ready for implementation plan.

**Date:** 2026-05-18

---

## Background

The DMZ share page (`#/dmz/share/<token>`) renders the shared folder for a
guest. Its topbar skeleton (`dmz/sharebox/skeleton/desk-content.js`) used to
render `newFileMenu` — an "Add new" dropdown with Folder / Note / Document /
Spreadsheet / Presentation.

That menu was **non-functional**: the DMZ window manager `__dmz_wm`
(`dmz/wm/index.js`, extends `window/manager`) has no handlers for
`add-folder` / `add-note` / `new-document`, and clicking emitted
`"method undefined has not been processed"` warnings. It was removed in commit
`f2e8c40a`.

Decision (from brainstorming): bring "Add new" back, but **Folder only** —
a guest with edit permission creating a sub-folder to organise their uploads.
Note / Document / Spreadsheet / Presentation stay out (they need editors that
work in an anonymous guest context — separate effort).

**Feasibility:** `media.make_dir` has ACL `scope: hub`, `permission: { src: write }`
— identical to `media.upload`. A DMZ guest who can upload (share token + write
privilege) can therefore call `make_dir` the same way. **No backend change.**

### Why the service arrived as `undefined`

`__dmz_wm.onUiEvent` reads `cmd.service || cmd.model.get(_a.service)`. It does
**not** read `args.service`. When a topbar menu event bubbles in via
`onChildBubble`, the service name is carried in `args` — so `__dmz_wm` saw
`undefined`. The desk window manager reads `args.service || cmd.mget(_a.service)`
and works; `__dmz_wm` must do the same.

---

## Part 1 — Folder-only, role-gated "Add new" menu

**Files:**
- Modify: `src/drumee/builtins/window/skeleton/toolkit/index.js` (`newFileMenu`)
- Modify: `src/drumee/modules/dmz/sharebox/skeleton/desk-content.js`

### `newFileMenu` — optional item filter

`newFileMenu(ui, opt = {})` currently always builds all five menu items. Add an
optional `opt.items` array of service names; when present, keep only the items
whose `service` is in that list:

```js
export function newFileMenu(ui, opt = {}) {
  const cnWindowButton = `${ui.fig.group}-button`;
  const cnWindowBody = `${ui.fig.group}-split-body`;
  const triggerIco = opt.triggerIco || "editbox_list-plus";
  const allItems = [
    { service: "add-folder", ico: "dock-folder", content: LOCALE.FOLDER,
      area: ui.mget(_a.area) || _a.personal, filename: LOCALE.NEW_FOLDER },
    { service: "add-note", ico: "raw-note", content: LOCALE.NOTE },
    { service: "new-document", name: "document.docx",
      ico: "raw-documents_word", content: LOCALE.DOCUMENT },
    { service: "new-document", name: "spreadsheet.xlsx",
      ico: "raw-documents_excel", content: LOCALE.SPREADSHEET },
    { service: "new-document", name: "presentation.pptx",
      ico: "raw-documents_powerpoint", content: LOCALE.PRESENTATION },
  ];
  const menuItems = opt.items
    ? allItems.filter((it) => opt.items.includes(it.service))
    : allItems;
  return Skeletons.Box.X({
    className: `${cnWindowBody}__buttons-container`,
    kids: [
      dropdownMenuButton(ui, {
        className: cnWindowButton,
        trigger: Skeletons.Button.Label({
          className: `${cnWindowButton}__label-button secondary`,
          label: LOCALE.ADD_NEW || "Add new",
          ico: triggerIco,
          uiHandler: ui,
          partHandler: ui,
        }),
        menuItems,
      }),
    ],
  });
}
```

Existing callers (folder / team / sharebox windows) pass no `opt.items`, so they
keep all five items — behaviour unchanged.

### DMZ topbar — show Folder-only menu, gated by write role

In `dmz/sharebox/skeleton/desk-content.js` `dmzTopbar`, the `newFileMenu` call
was removed. Restore it Folder-only, gated by the **write** permission (the
"Can Edit & Upload" Access-level bit — the same permission `make_dir` requires).

`dmzTopbar` already computes `canUpload`. Add `canEdit`:

```js
const canUpload = ui.havePermission(_K.permission.upload, ui.mget(_a.privilege));
const canEdit = ui.havePermission(_K.permission.write, ui.mget(_a.privilege));
```

In the `buttons` box `kids`, replace the explanatory comment with:

```js
  const buttons = Skeletons.Box.X({
    className: `${cnWindowButton}__buttons-wrapper`,
    kids: [
      // visioMenu(ui),
      canEdit ? newFileMenu(ui, { items: ["add-folder"] }) : null,
      canUpload
        ? Skeletons.Button.Label({
            className: `${cnWindowButton}__label-button`,
            label: LOCALE.UPLOAD,
            ico: "desktop_upload",
            service: _e.upload,
            uiHandler: ui,
          })
        : null,
      settingsBtn,
    ],
  });
```

`newFileMenu` is re-added to the destructured import from
`builtins/window/skeleton/toolkit/index`.

---

## Part 2 — `add-folder` handler in `__dmz_wm`

**Files:**
- Modify: `src/drumee/modules/dmz/wm/index.js`

`__dmz_wm`'s own skeleton (`dmz/wm/skeleton/index.js`) already renders a
`Skeletons.Wrapper.Y({ name: "modal" })` → part `wrapper-modal`. The
create-folder dialog feeds into it, reusing the existing
`builtins/window/folder/skeleton/create-folder-dialog` skeleton (a name
`Entry` with `sys_pn: "create-folder-name"`, submit service
`create-folder-submit`, close service `close-folder-dialog`).

Add three `onUiEvent` cases (the routing fix in Part 3 makes `service` arrive):

```js
case "add-folder":
  return this.ensurePart("wrapper-modal").then((p) => {
    p.feed(require("builtins/window/folder/skeleton/create-folder-dialog")(this));
    p.el.dataset.mode = "create-folder";
    this.ensurePart("create-folder-name").then(
      (entry) => entry.focus && entry.focus(),
    );
  });

case "close-folder-dialog":
  return this.ensurePart("wrapper-modal").then((p) => {
    p.el.dataset.mode = "";
    p.clear();
  });

case "create-folder-submit":
  return this._createFolder(cmd);
```

`_createFolder(cmd)`:

```js
_createFolder(cmd) {
  if (this._creatingFolder) return;
  this._creatingFolder = 1;
  const entry = this.getPart("create-folder-name");
  const value =
    (cmd.getValue && cmd.getValue()) ||
    (entry && entry.getValue && entry.getValue()) ||
    LOCALE.NEW_FOLDER;
  const filename = String(value).trim() || LOCALE.NEW_FOLDER;
  if (/^(\.+|.+\/.+| +|\-{1,1})$/.test(filename)) {
    this._creatingFolder = 0;
    return Butler.say(LOCALE.INVALID_FILENAME);
  }
  return this.postService(SERVICE.media.make_dir, {
    hub_id: this.mget(_a.hub_id),
    nid: this.mget(_a.nid),
    dirname: filename,
    filename,
    token: this.mget(_a.token),
  })
    .then((data) => {
      if (data && (data.error || data.error_code)) {
        return Butler.say(LOCALE[data.error] || data.reason || data.error);
      }
      this.ensurePart("wrapper-modal").then((p) => {
        p.el.dataset.mode = "";
        p.clear();
      });
      this.ensurePart(_a.list).then((l) => l && l.restart && l.restart());
    })
    .catch((e) => {
      this.warn("DMZ create folder failed", e);
      Butler.say(e.reason || e.error || LOCALE.TRY_AGAIN);
    })
    .finally(() => {
      this._creatingFolder = 0;
    });
}
```

`Butler.say` (already used by `__dmz_wm.fetchMediaAttributes`) is the
DMZ-safe transient message — the desk's `Wm.alert` is not guaranteed in a
DMZ session.

- `hub_id` / `nid` come from the DMZ window model (set in `initialize`).
- `token` (the share token) is passed so the request is authorised the same
  way DMZ uploads are.
- On success the dialog closes and the file list (`sys_pn: _a.list`,
  `List.Smart`) is restarted so the new folder appears.
- The filename guard mirrors the desk's `createFolderFromDialog`.

---

## Part 3 — `__dmz_wm.onUiEvent` reads `args.service`

**Files:**
- Modify: `src/drumee/modules/dmz/wm/index.js`

Current:

```js
onUiEvent(cmd, args) {
  if (args == null) { args = {}; }
  const service = cmd.service || cmd.model.get(_a.service);
```

Change the resolution to read `args.service` first (matching the desk window
manager), so a bubbled menu event delivers its service name:

```js
onUiEvent(cmd, args) {
  if (args == null) { args = {}; }
  const service =
    args.service ||
    cmd.service ||
    (cmd.model && cmd.model.get(_a.service));
```

The `default` branch still warns on genuinely unhandled services.

---

## Data flow

```
guest clicks "Add new" → "Folder"
  → service "add-folder" reaches __dmz_wm.onUiEvent (args.service)
  → create-folder name dialog feeds into wrapper-modal
guest types a name → submit
  → "create-folder-submit" → _createFolder()
  → postService(media.make_dir, { hub_id, nid, dirname, filename, token })
  → server (scope:hub, write — satisfied by share token + write privilege)
    creates the sub-folder
  → dialog closes, file list restarts → new folder shown
```

## Error handling

- Invalid filename (`.`, contains `/`, blank, single `-`) → `Butler.say(INVALID_FILENAME)`,
  no request sent.
- Server error (`error` / `error_code` in response, or rejected promise) →
  `Butler.say` with the reason; dialog stays open for retry.
- Guest without write permission never sees the menu (`canEdit` gate).

## Out of scope

- Note / Document / Spreadsheet / Presentation creation in DMZ.
- Any backend change — `media.make_dir` already serves write-capable guests.
- The `dropdownMenuButton` menu-item markup is unchanged; the regular
  folder/team/sharebox windows already drive it correctly.

## Testing (manual — Drumee has no test runner)

1. **Role gating:** Open a share link whose Access level grants "Can Edit &
   Upload" → the "Add new" button appears. Open one with view-only access →
   no "Add new" button.
2. **Folder-only:** The "Add new" dropdown lists exactly one item — "Folder".
3. **Create:** Click Folder → name dialog appears → type "Guest uploads" →
   submit → a `media.make_dir` request fires (200), the dialog closes, and the
   new folder appears in the list.
4. **Invalid name:** Submit a blank or `/`-containing name → `INVALID_FILENAME`
   alert, no request.
5. **No console warning:** Clicking "Add new" → "Folder" no longer logs
   `"method undefined has not been processed"`.
