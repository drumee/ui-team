# Shared Folder "Manage Access" — Design

**Goal:** Fix the non-functional link-expiry control in the "Manage Access"
panel, and make the Folder Settings of a `share`-type folder open that same
"Manage Access" panel instead of the generic folder-settings panel.

**Status:** Approved design — ready for implementation plan.

**Date:** 2026-05-18

---

## Background

The `permission_share` widget (`src/drumee/builtins/permission/share/`, kind
`permission_shared`) renders the **"Manage Access"** panel. It is shown:

- right after a user creates a `share`-type folder/workspace
  (`media/form/index.js` → `parent.feed({ kind: "permission_shared" })`), and
- from a hub window's settings (`window/hub.js` `openSettings`,
  `case _a.share`).

The panel has three sections — **Public Link**, **Access Level**, **Link
Expiration** — plus an **Apply Changes** button. Expiry is stored on the widget
model as `days` / `hours`; the backend service `hub.update_external_settings`
(`flag: "expiry"`) already accepts `days` / `hours` and is called by both
`_applyChanges()` and `_clearExpiry()`.

A separate panel, `settings-action-panel` (`window/folder/skeleton/`), is the
**Folder Settings** panel of the `window_folder` window — it currently always
renders folder actions + invite + permissions matrix, regardless of folder type.

### Two problems

1. **Expiry control is dead.** The Link Expiration row has a calendar button
   with `service: "set-expiry"`, but `permission_share`'s `onUiEvent` has **no
   `set-expiry` case**. Clicking it falls through to `default` and does nothing,
   so the user can never set an expiry — it is permanently stuck at the default
   "No expiration".

2. **Folder Settings of a `share` folder shows the wrong layout.**
   `window_folder.switchShowFolderSettings` always feeds `settings-action-panel`.
   For a `share`-type folder the user expects the same "Manage Access" layout
   they saw at creation time.

The backend needs **no changes** — `hub.update_external_settings` already
supports expiry. Both problems are frontend-only.

---

## Part 1 — Link-expiry preset menu

**Files:**
- Modify: `src/drumee/builtins/permission/share/skeleton/index.js`
- Modify: `src/drumee/builtins/permission/share/index.js`
- Modify: `src/drumee/builtins/permission/share/skin/index.scss`

### Behaviour

Clicking the calendar button opens an inline **preset-duration dropdown**
listed directly under the Link Expiration row. Options:

| Option label (reuses existing format) | `days` value |
|---------------------------------------|--------------|
| No expiration                         | `0`          |
| In 1 Day                              | `1`          |
| In 7 Days                             | `7`          |
| In 30 Days                            | `30`         |
| In 90 Days                            | `90`         |

- The default remains **No expiration** (`days = 0`).
- Selecting an option sets `days` (and `hours = 0`), updates the expiry-row
  label, closes the menu, and **persists immediately** via
  `hub.update_external_settings` — mirroring the existing `_clearExpiry()`
  behaviour so the set/clear pair is consistent.
- `_applyChanges()` already re-sends expiry on "Apply Changes"; that stays as a
  redundant-but-harmless safety net. No change needed there.

Option labels reuse the **existing** expiry-label formatting (the
`days ? "In N Day(s)" : NO_EXPIRATION` logic already in the skeleton / the
widget's `_expiryLabel()`), so **no new locale keys are required**.

### Skeleton changes (`skeleton/index.js`)

The Link Expiration section currently renders:

```
section-label "LINK EXPIRATION"
expiry-row:  [expiry-label]  [calendar-btn service:"set-expiry"]  [Clear]
```

Add, immediately after `expiry-row`, a dropdown rendered **only when
`ui._expiryMenuOpen` is truthy**:

```js
ui._expiryMenuOpen
  ? Skeletons.Box.Y({
      className: `${fig}__expiry-menu`,
      kids: EXPIRY_PRESETS.map((preset) =>
        Skeletons.Note({
          className: `${fig}__expiry-option`,
          content: formatExpiry(preset),          // "No expiration" / "In 7 Days"
          days: preset,                            // top-level prop — read via cmd.mget
          state: (parseInt(ui.mget(_a.days)) || 0) === preset ? 1 : 0,
          service: "pick-expiry",
          uiHandler: [ui],
        }),
      ),
    })
  : null,
```

- `EXPIRY_PRESETS = [0, 1, 7, 30, 90]` — module-level constant in the skeleton.
- `formatExpiry(days)` — module-level helper: `days ? \`In ${days} Day${days !== 1 ? "s" : ""}\` : (LOCALE.NO_EXPIRATION || "No expiration")`. The existing inline `expiryLabel` computation is replaced by a call to this helper so the row label and the menu options stay identical.

### Widget changes (`index.js`)

Add two `onUiEvent` cases:

```js
case "set-expiry":
  this._expiryMenuOpen = !this._expiryMenuOpen;
  return this._render();

case "pick-expiry": {
  const days = parseInt(cmd.mget("days")) || 0;
  this._expiryMenuOpen = false;
  this.mset({ days, hours: 0 });
  this._render();
  return this._persistExpiry();
}
```

`cmd.mget("days")` reads the `days` skeleton prop off the clicked option's
model — the same mechanism `_toggleAccess()` uses to read `bit`
(`cmd.mget('bit')`).

Factor the immediate-persist out of `_clearExpiry()` into a shared
`_persistExpiry()` helper so set and clear use one code path:

```js
_persistExpiry() {
  const hub_id = this.mget(_a.hub_id);
  if (!hub_id) return;
  const days = parseInt(this.mget(_a.days)) || 0;
  const hours = parseInt(this.mget(_a.hours)) || 0;
  return this.postService(SERVICE.hub.update_external_settings, {
    hub_id,
    flag: _a.expiry,
    days,
    hours,
    validity_mode: days || hours ? _a.limited : _a.infinity,
  }).catch((e) => this.warn && this.warn("persist expiry failed", e));
}

_clearExpiry() {
  this._expiryMenuOpen = false;
  this.mset({ days: 0, hours: 0 });
  this._render();
  return this._persistExpiry();
}
```

`cmd.get("days")` reads the `dataset.days` from the clicked option (the widget
already uses `cmd.get(...)` elsewhere — see `onUiEvent`'s `cmd.get(_a.service)`).

### Skin changes (`skin/index.scss`)

Style `__expiry-menu` (the dropdown container) and `__expiry-option` (each row,
with a `[data-state="1"]` selected style). Visually a small panel under the
expiry row — consistent with the panel's existing section styling.

### Edge cases

- Re-clicking the calendar button while the menu is open toggles it closed.
- Selecting the currently-active option is a no-op-ish: it re-persists the same
  value and closes the menu — harmless.
- `_loadSettings()` may overwrite `days`/`hours` from the server on panel load;
  `_expiryMenuOpen` is independent widget state and is not part of the model,
  so a re-render from `_loadSettings()` simply renders the menu closed (default
  `undefined`/falsy).

---

## Part 2 — Folder Settings routes to "Manage Access" for `share` folders

**Files:**
- Modify: `src/drumee/builtins/window/folder/index.js`

### Behaviour

When the user opens **Folder Settings** on a `window_folder` whose folder area
is `share`, the window's right-hand settings panel (`dialogWrapper`) shows the
**`permission_shared` "Manage Access"** widget — the same panel shown at
folder-creation time. For any other area the existing `settings-action-panel`
is unchanged (including the real-member-list loading already wired into
`switchShowFolderSettings`).

### Widget changes (`window/folder/index.js`)

`switchShowFolderSettings(cmd)` gains an area branch at the top of its
"open" path (after the `isShowSettings` toggle-off early return):

```js
switchShowFolderSettings(cmd) {
  if (this.isShowSettings) {
    this.isShowSettings = false;
    return this.dialogWrapper.clear();
  }
  this.isShowSettings = true;

  // share-area folders use the same "Manage Access" panel shown at
  // creation time, instead of the generic folder-settings panel.
  if (this.mget(_a.area) === _a.share) {
    this.dialogWrapper.feed({
      kind: "permission_shared",
      media: this.mget(_a.media) || this.media,
      hub_id: this.mget(_a.hub_id),
      uiHandler: [this],
      persistence: _a.once,
    });
    const c = this.dialogWrapper.children.last();
    if (c) {
      c.once(_e.destroy, () => {
        this.isShowSettings = false;
        return this.unselect();
      });
    }
    return;
  }

  // ...existing settings-action-panel flow (member fetch + feed)...
}
```

- `permission_share.initialize` already reads `opt.media`
  (`copyPropertiesFrom`) and `hub_id` — the same props `window/hub.js`
  `openSettings` passes. No changes to `permission_share` are required.
- `permission_share` self-closes via its own `_closeSidebar()` → `suppress()`;
  the `c.once(_e.destroy, ...)` listener resets `isShowSettings` so the next
  Folder-Settings click re-opens correctly.
- The non-`share` branch keeps the async `hub.get_members_by_type` fetch +
  `render()` flow already present in `switchShowFolderSettings`.

### Edge cases

- `permission_share`'s close animation (`position` dataset) runs inside the
  folder window's `dialogWrapper`; it is self-contained CSS and works in that
  container.
- If the folder window is closed while the panel is open, `permission_share`'s
  own `isDestroyed` guards apply; the `_e.destroy` listener still fires and
  resets `isShowSettings` (harmless on an already-closing window).

---

## Out of scope

- No backend changes — `hub.update_external_settings` already supports expiry.
- A real calendar date-picker (preset menu was chosen instead).
- The per-member role-change / remove actions in `settings-action-panel`
  remaining local-only — tracked separately, unrelated to `share` folders.
- Changing Folder Settings for `private`/`restricted` folders — they keep
  `settings-action-panel`.

## Testing (manual — Drumee has no test runner)

1. **Expiry menu:** Open Manage Access on a share folder. Click the calendar
   icon → preset dropdown appears. Pick "In 7 Days" → row label shows
   "In 7 Days", menu closes, a `hub.update_external_settings` request fires
   with `days=7`. Reload the panel → label still "In 7 Days". Click "Clear" →
   back to "No expiration".
2. **Default:** A folder with no expiry shows "No expiration" and the menu
   defaults closed.
3. **Folder Settings routing:** Open a `share`-type folder window → Folder
   Settings → the "Manage Access" panel appears (not the actions/invite panel).
   Open a `private` folder window → Folder Settings → the normal
   `settings-action-panel` still appears with the real member list.
4. **Re-open:** Close the Manage Access panel, click Folder Settings again →
   panel re-opens correctly.
