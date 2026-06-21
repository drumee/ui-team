# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Drumee Web OS UI — a collaborative web application (v3.3.1, AGPL-3.0) built on Backbone.js/Marionette with a custom JSON-based Skeletons UI rendering framework. Do **not** generate HTML; all UI is expressed as Skeletons component trees.

### Figma (design-to-code)

When implementing a Figma design (or any Figma MCP output), follow `.claude/rules/figma-design-to-skeleton.md`. Figma MCP tools return HTML/React/Tailwind — that is a **reference only**; translate it into a `Skeletons.*` tree (Box.Y/X/G/Z, Button, Note, Entry, List, Image…), style with `maps.scss` tokens + BEM `${ui.fig.family}__*`, text via `LOCALE.*`, and route SVG icons through `icons/src/` + `npm run build:icons` (`ico:'name'`) — never paste markup, hex/px literals, raw strings, or inline `<svg>`.

## Commands

```bash
npm run dev          # Start development server (drumee-ui-devel)
npm run deploy       # Production build + deploy (drumee-ui-deploy) — this is what CI runs
npm run build:icons  # Rebuild SVG icon sprites (also copies *.sprite.svg → *.sprite.txt)
npm run md:style     # Recompile markdown viewer CSS
npm run setup        # Write dev environment config (run once after clone)
npm run add-widget -- --fig=group.name --dest src/path/to/widget  # Scaffold a new widget (drumee-make-widget)
```

Build/seed generation now lives inside `@drumee/ui-dev-tools` (the `drumee-ui-devel` / `drumee-ui-deploy` binaries), **not** in this repo's `webpack/` directory:

- **`npm run deploy` is the production build** and the command CI uses. There is no `build` script — it was removed because it referenced `./webpack/seeds/index.js`, an entry-point generator that no longer exists (along with `webpack/seed/` and the old `seed-letc` bin). Don't recreate that path; the seed/entry-point logic was intentionally moved into the dev-tools package.
- `webpack/` here holds only the shared config consumed by dev-tools (`module.js`, `resolve.js`, `plugins.js`, `sync.js`, `postcss.config.js`, `tsconfig.json`).

ESLint (v9) is a dependency but no `lint` script or config file is committed — there is no lint or test runner wired up.

`postinstall` runs `patch-package`. **`@drumee/ui-core` is patched** (`patches/@drumee+ui-core+1.1.43.patch`) — that patch reapplies on every install, so account for it before upgrading `@drumee/ui-core` or editing the patch.

`--fig` sets the widget identity (`group` + `family` BEM root); `--dest` is the output directory.

There is no test runner configured in this project.

### Icons

SVG icons live in `icons/src/normalized/` and `icons/src/raw/`. After adding or modifying any SVG source file, run `npm run build:icons` to regenerate the sprite sheets in `icons/sprites/`.

## Architecture

### Bootstrap Flow

`src/drumee/index.web.js` → `drumee.js` (Marionette.Application) → XHR `yp.get_env` → `src/drumee/api.js` sets domain/endpoint/WS paths → globals initialized (Host, Visitor, Organization, Platform) → router loaded.

### Router (`src/drumee/router/`)

Hash-based routing (`#@module` or `#/module`). Routes resolve to one of: `desk`, `welcome`, `dmz`, `devel`, `plugins`, `sandbox`, `admin`. Access control distinguishes public vs. private modules. Layout adapts to screen size via RADIO_BROADCAST responsive events.

### Module Layer (`src/drumee/modules/`)

| Module | Purpose |
|--------|---------|
| `desk` | Main authenticated workspace, window management, activity panel |
| `welcome` | Sign-in, onboarding, signup flows |
| `dmz` | Public/guest access: sharing, meetings |
| `devel` | Dev tools: icon browser, locale management |
| `sandbox` | Isolated content rendering |

Modules are lazy-loaded via dynamic `import()` through the Kind registry (`src/drumee/__core/kind.js`). The addon registry (`src/drumee/seeds.js`) lists 140+ dynamically imported modules.

### Builtins (`src/drumee/builtins/`)

- **window/** — 39+ window types (account, addressbook, adminpanel, channel, meeting, share, etc.) with context menus and Z-ordering
- **media/** — Flag, Grid, Minifyer, Notification, Paste, Row, Simple, Uploader widgets
- **player/** — Audio, Document, Image, Stream, Text, Vector, Video viewers (PDF via `@embedpdf/pdfium`)
- **editor/** — Diagram, JSON, Markdown, Note editors
- **widget/** — Settings, invitation, menus, counters
- **handler/** — Event handlers and services
- **skeleton/** — UI composition, workspace indicators

### Core Services (`src/drumee/__core/`)

`host.js`, `user.js`, `organization.js`, `mfs.js` (memory filesystem), `kind.js` (component registry), `addons.js` (extensions). WebRTC, history, and context menu subsystems also live here.

### Build System

Webpack 5 config is split across `webpack/`:
- `module.js` — loaders (SCSS/CSS, CoffeeScript, images, fonts, WASM, TypeScript, Underscore/Handlebars templates)
- `resolve.js` — 40+ path aliases (e.g., `desk`, `builtins`, `media`, `locale`, `toolkit`)
- `plugins.js` — MiniCssExtract, CleanWebpack, DefinePlugin (`__BUILD__`, `__VERSION__`, `__COMMIT__`, `__TEMPLATES__`), StatsWriter, Duplicates
- `sync.js` — post-build git-based versioning and remote sync

These files are config inputs consumed by the `@drumee/ui-dev-tools` build binaries. The old in-repo entry-point generator (`webpack/seeds/`, `webpack/seed/`) has been removed — that logic now lives in dev-tools.

Supported file extensions: `.coffee`, `.js`, `.scss`, `.css`, `.web.coffee`, `.web.js`, `.json`, `.tpl`, `.tsx`, `.ts`

---

## Runtime Globals

These are injected at bootstrap — **no `import` or `require` needed** anywhere in `src/`:

| Global | Source | Description |
|--------|--------|-------------|
| `_a` | `lex/attribute` | Attribute name constants (e.g. `_a.hub_id`, `_a.live`) |
| `_e` | `lex/event` | Event name constants (e.g. `_e.send`, `_e.commit`, `_e.close`) |
| `_K` | `lex/constants` | App-wide constants including `_K.permission.*` bitmasks |
| `LOCALE` | `locale/en.json` | All user-visible strings — never hardcode text |
| `WARNING` | `lex/warning` | Warning constants |
| `ERROR` | `lex/error` | Error constants |
| `SERVICE` | `lex/services` (or Platform) | Server service endpoint names |
| `Skeletons` | `@drumee/ui-core` | UI component builder |
| `Kind` | `@drumee/ui-core` | Component kind registry |
| `Preset` | `@drumee/ui-core` | Pre-built component configs (`Preset.List.Orange_e`, etc.) |
| `Dayjs` | `dayjs` | Date/time library with relativeTime + duration plugins |
| `createSafeObject` | `@drumee/ui-essentials` | Proxy that returns `''` for undefined keys |
| `LetcBox` | `@drumee/ui-core` | Base class for standard widgets |
| `DrumeeMFS` | `@drumee/ui-core` | Base class for media/filesystem widgets |
| `LetcList` | `@drumee/ui-core` | Base list widget |
| `LetcText` | `@drumee/ui-core` | Base text widget |
| `Visitor` | `@drumee/ui-core` | Backbone.Model for the current user (`Visitor.id`, `Visitor.get(...)`) |
| `Host` | `@drumee/ui-core` | Backbone.Model for the current hub/host |
| `Platform` | `@drumee/ui-core` | Backbone.Model for platform config |
| `Organization` | `@drumee/ui-core` | Backbone.Model for the organization |
| `Env` | `@drumee/ui-core` | Backbone.Model for raw environment data |
| `currentDevice` | runtime | Device fingerprint string |

### Widget model helpers

These methods are mixed into `Backbone.View` by `@drumee/ui-core/letc/addons/` — available on every widget with no imports:

| Method | Source file | Description |
|--------|-------------|-------------|
| `this.mget(key)` | `backbone/view/utils.js` | `this.model.get(key)` shorthand |
| `this.mset(k, v)` | `backbone/view/utils.js` | `this.model.set(k, v)` shorthand |
| `this.get(p)` | `backbone/view/utils.js` | model.get first, falls back to `getOption(p)` |
| `this.getAttr()` | `backbone/view/utils.js` | `model.toJSON()` minus internal keys |
| `this.setState(n)` | `backbone/view/state.js` | Sets `data-state` on `this.el` |
| `this.goodbye()` | `backbone/view/utils.js` | Animated self-destroy + removes from parent collection |
| `this.bindEvent(...)` | `backbone/view/event.js` | Subscribe to WebSocket events |
| `this.unbindEvent()` | `backbone/view/event.js` | Unsubscribe from WebSocket events |
| `this.fireEvent(sig, ...)` | `backbone/view/event.js` | Trigger on self and all registered listeners |
| `this.triggerHandlers(args)` | `letc/addons/letc.js` | Emit event upward to `uiHandler` parents |
| `this.declareHandlers()` | `letc/addons/letc.js` | Register this widget with its `uiHandler`/`partHandler` — call in `initialize` when the widget handles events from children |
| `this.getData(name?)` | `letc/addons/letc.js` | Collect `formItem`-bound field values from descendant inputs |
| `this.ensurePart(pn)` | `marionette/collection-view.js` | Promise resolving to the named part once rendered |
| `this.getParentByKind(kind)` | `backbone/view/tree.js` | Walk parent chain to find widget by kind string |

### Widget base classes

- Extend **`LetcBox`** for all standard widgets (menus, panels, forms, chat, etc.)
- Extend **`DrumeeMFS`** only for widgets that represent media filesystem nodes (files, hubs, folders)

### `ui.fig` — widget identity

Every widget has a `fig` object derived from the class name (defined in `@drumee/ui-core/letc/addons/letc.js`):

1. Strip leading underscores from the constructor name
2. Replace all `_` with `-` → this becomes `fig.family` (the full hyphenated name)
3. First `-`-delimited segment → `fig.group`; remainder → `fig.name`

```
class __chat_hub      →  fig.family = "chat-hub",          fig.group = "chat",       fig.name = "hub"
class __permission_share  →  fig.family = "permission-share",  fig.group = "permission", fig.name = "share"
class settings_permission →  fig.family = "settings-permission", fig.group = "settings",  fig.name = "permission"
```

**`fig.family` is the BEM root** — use it directly as the CSS prefix in skeleton files:

```javascript
// In skeleton/index.js
const pfx = _ui_.fig.family;  // e.g. "chat-hub"

Skeletons.Box.Y({
  className: `${pfx}__container`,
  kids: [
    Skeletons.Note({ className: `${pfx}__title`, content: _ui_.mget(_a.name) })
  ]
});
```

The widget's root DOM element automatically receives classes: `{group} {family} {group}__item {group}__ui {family}__ui`.

### WebSocket subscription

To receive real-time events, subscribe in `initialize` and unsubscribe in `onBeforeDestroy`:

```javascript
initialize(opt = {}) {
  super.initialize(opt);
  this.bindEvent(_a.live);   // subscribes to WebSocket
}

onBeforeDestroy() {
  this.unbindEvent(_a.live); // unsubscribes
}

onWsMessage(svc, data, options = {}) {
  const { service } = options || svc;
  switch (service) {
    case SERVICE.channel.post:
      // handle incoming message
      break;
    default:
      if (super.onWsMessage) super.onWsMessage(svc, data, options);
  }
}
```

---

## Frontend SDK

> Full API reference: https://drumee.github.io/documentation/api-reference/frontend-sdk/

### Core Widget Methods

These methods are available on every widget instance.

#### `onDomRefresh()`

Lifecycle hook called automatically once the widget's DOM element is ready (mounted but before children render). Use it to feed the initial skeleton and load data.

```javascript
onDomRefresh() {
  this.feed(require("./skeleton").default(this));
}
```

#### `feed(c)`

Replaces all children of a widget part with new content. Primary way to render or re-render a skeleton.

| Parameter | Type | Description |
|-----------|------|-------------|
| `c` | Array / Object / Function / `null` | New content. `null` is a no-op. |

Returns `children.last()`.

```javascript
// Initial render
async onDomRefresh() {
  await this.loadEnv();
  this.feed(require("./skeleton").default(this));
}

// Switch pages on tab click
this.__content.feed(this.skeletons[this._page](this));

// Conditional children (null values are filtered)
part.feed([
  Skeletons.Note("Always shown"),
  isMobile ? Skeletons.Note("Mobile only") : null,
]);
```

#### `append(c, index?)`

Inserts child component(s) into a widget part at runtime.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `c` | Array / Object / Function | Yes | Component(s) to insert |
| `index` | Number | No | Position; omit to append at end |

Returns the newly added component (or component at `index`).

```javascript
part.append([
  Skeletons.Note({ content: "First item" }),
  Skeletons.Note({ content: "Second item" }),
]);

this.ensurePart("my-list").then((list) => {
  list.append(Skeletons.Note("Inserted at top"), 0);
});

part.append((ui) => Skeletons.Note({ content: `Welcome, ${ui._userName}` }));
```

#### `prepend(c)`

Inserts a component at the beginning of a widget part (inverse of `append`).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `c` | Object / Array / Function | Yes | Component to insert at index 0 |

```javascript
this.ensurePart("message-list").then((list) => {
  list.prepend(Skeletons.Note({ className: "message-list__item", content: newMessage.text }));
});
```

#### `fetchService(service, payload)` / `postService(service, payload)`

`fetchService` — GET request to query data. `postService` — POST request to mutate data.

Both accept either `(serviceName, payloadObject)` or a single `({ service, ...payload })` object. Both automatically inject `socket_id`, `device_id`, and auth headers. Both strip UI-only fields (`widgetId`, `uiHandler`, `partHandler`, `errorHandler`) before sending.

```javascript
// GET
const data = await this.fetchService(SERVICE.my_module.get_data, { uid, page: 1 });

// POST
const data = await this.postService(SERVICE.my_module.save_data, { uid, ...payload });
```

---

### Skeleton Structure & Event System

Two skeleton attributes drive all widget communication:

- **`service`** — when the element is interacted with, calls `onUiEvent` on the widget specified by `uiHandler`
- **`sys_pn`** — when the element renders into the DOM, calls `onPartReady` on the widget specified by `partHandler`

#### `service` + `uiHandler` → `onUiEvent`

`service` declares the action name. `uiHandler` specifies which widget(s) receive the call — **always pass as an array**. The framework invokes `onUiEvent(cmd, args)` on each handler, where `cmd` is the triggering element and `args` contains the event payload.

```javascript
// Skeleton
Skeletons.Button.Svg({ service: "my-action", uiHandler: [ui] });

// Multiple handlers
Skeletons.Button.Svg({ service: "my-action", uiHandler: [ui, parentUi] });

// Widget
async onUiEvent(cmd, args = {}) {
  const service = args.service || cmd.get(_a.service);
  switch (service) {
    case "my-action":
      const data = cmd.mget("my_param"); // extra skeleton props pass via mget
      await this.postService(SERVICE.my_module.do_action, { data });
      break;
  }
}
```

Rules:
- `service` without `uiHandler` → `onUiEvent` never fires
- `uiHandler` without `service` → element is interactive but no named action is dispatched

#### `sys_pn` + `partHandler` → `onPartReady`

`sys_pn` assigns a name to a skeleton element. `partHandler` specifies which widget receives the call. The framework invokes `partHandler.onPartReady(child, pn)` once the element is mounted, where `child` is the rendered widget instance and `pn` is the `sys_pn` string.

```javascript
// Skeleton
Skeletons.Box.Y({ sys_pn: "content", partHandler: ui });

// Widget
onPartReady(child, pn) {
  switch (pn) {
    case "content":
      child.feed(mySubSkeleton);
      break;
    default:
      super.onPartReady(child, pn); // always delegate unhandled cases
  }
}
```

- `sys_pn` without `partHandler` → `onPartReady` never fires, but `ensurePart` still works
- Dynamic names (e.g., `` `item-action:${item.id}` ``) enable per-item access without full re-renders
- `onPartReady` fires once; `ensurePart` allows repeated access to existing parts

---

### Skeletons Component Reference

All UI is expressed as Skeletons component trees. Never generate raw HTML.

#### Component function template

```javascript
export function componentName(ui, opt) {
  const { prop1, prop2, defaultVal = value } = opt;
  const pfx = `${ui.fig.family}__component-name`;
  return Skeletons.Box.Y({ className: `${pfx}-container`, kids: [...] });
}
```

#### CSS class naming conventions

| Level | Box.Y / Box.X / Box.G classNames |
|-------|----------------------------------|
| Outer (root, contains Box children) | `${pfx}-container`, `${pfx}-wrapper` |
| Middle (has both Box and leaf children) | `${pfx}-section`, `${pfx}-group` |
| Inner (contains only leaves: Element, EntryBox, Button) | `${pfx}-content`, `${pfx}-inner`, `${pfx}-row`, `${pfx}-line` |

SASS derives from `kind`. For `kind='user_profile'`: `fig=user`, `family=profile` → `.user-profile { &__component-name { ... } }`.

#### Common props shared by most components

| Prop | Alias | Description |
|------|-------|-------------|
| `className` | `cn` | CSS class(es) |
| `sys_pn` | — | Named part for lifecycle |
| `uiHandler` | `ui` | Routes interaction events — always pass as an array: `[ui]` |
| `partHandler` | `part` | Routes part lifecycle events |
| `service` | `api` (string) | Action name triggered on interaction |
| `dataset` | — | `data-*` attributes |
| `state` | — | `0` or `1`, reflected to `data-state` |
| `radio` | — | Channel ID for grouped toggle |
| `radiotoggle` | — | `1`/`0` toggle mode |

---

#### `Skeletons.Box.Y / .X / .G / .Z`

Layout containers — the framework sets `display: flex` and the corresponding direction automatically. **Never add `display: flex` or `flex-direction` in SCSS for Box-rendered elements.**

| Variant | CSS equivalent |
|---------|----------------|
| `.Y` | `display: flex; flex-direction: column` |
| `.X` | `display: flex; flex-direction: row` |
| `.G` | `display: flex` with grid template (flex-based, not CSS Grid) |
| `.Z` | `position: absolute` overlay |

| Prop | Description |
|------|-------------|
| `kids` | Array of child skeleton nodes |
| `kidsOpt` | Options merged into every child |
| `populate` | Generate items from data arrays (use `_prepend: 1` for top insertion) |

```javascript
Skeletons.Box.X({
  className: `${fig}__toolbar`,
  kids: [
    Skeletons.Button.Svg({ ico: "save", service: "save", uiHandler: [ui] }),
    Skeletons.Button.Svg({ ico: "close", service: "close", uiHandler: [ui] }),
  ],
});

Skeletons.Box.Y({ className: `${fig}__panel`, sys_pn: "content", uiHandler: [ui] });

Skeletons.Box.G({ className: `${fig}__grid`, partHandler: ui, kidsOpt: { active: 0 }, kids: items.map(renderItem) });

Skeletons.Box.Z({ className: `${fig}__overlay`, sys_pn: "overlay" });
```

---

#### `Skeletons.Button.Svg / .Label / .Icon`

| Variant | Renders |
|---------|---------|
| `Button.Svg` | Icon only — toolbars, action buttons |
| `Button.Label` | Icon + text label — menu items, checkboxes |
| `Button.Icon` | Icon with fixed custom dimensions |

All variants require `ico` (kebab-case SVG name, e.g. `'arrow-right'`, `'user-plus'`).

Additional `Button.Label` props: `label`, `labelClass`, `href`, `priority`, `bubble`, `initialState`, `reference`, `value`, `formItem`.

```javascript
Skeletons.Button.Svg({ ico: "my-icon", service: "my-action", uiHandler: [ui], className: `${fig}__btn` });

Skeletons.Button.Svg({ ico: "my-icon", service: "my-action", haptic: 1000, tooltips: LOCALE.MY_LABEL, className: `${fig}__btn` });

Skeletons.Button.Label({ ico: "my-icon", label: LOCALE.MY_PAGE, href: "#/desk/my-page" });

// Radio toggle
Skeletons.Button.Label({ ico: "my-icon", label: LOCALE.MY_OPTION, radio: MY_CHANNEL, initialState: currentState, service: "update", uiHandler: [ui] });

// Custom dimensions
Skeletons.Button.Icon({ ico: "my-icon", service: "my-action", uiHandler: [ui] }, { width: 30, height: 30, padding: 7 });

// Conditional disable
Skeletons.Button.Label({
  ico: "my-icon", label: LOCALE.MY_ACTION,
  service: isEnabled ? "my-action" : null,
  state: isEnabled ? 1 : 0,
  dataset: isEnabled ? undefined : { disabled: 1 },
  uiHandler: [ui],
});
```

---

#### `Skeletons.Element`

Generic DOM element renderer (images, video, audio, source tags). Use `Box` for layout, `Button` for interactive icons, `Note` for inline text instead.

| Prop | Description |
|------|-------------|
| `tagName` | HTML tag; defaults to wrapper element |
| `content` | Inner text or HTML |
| `flow` | Layout direction (`x`, `y`, `none`) |
| `attrOpt` / `attribute` | HTML attributes (e.g. `src`, `autoplay`) |
| `type` | `type` attribute value |
| `preload` | `preload` attribute value |

```javascript
Skeletons.Element({ tagName: "img", attribute: { src: myImageUrl }, style: { display: "none" } });

Skeletons.Element({ tagName: "video", className: `${fig}__video`, sys_pn: "video", attrOpt: { autoplay: "" }, dataset: { status: "idle" } });

Skeletons.Element({ tagName: "source", sys_pn: "audio-src", type: ui.mget("mimetype"), preload: "auto", attrOpt: { src: ui._url() } });
```

---

#### `Skeletons.Note`

The lightest primitive — inline text, labels, clickable notes.

```javascript
Skeletons.Note("Hello World");
Skeletons.Note("Loading...", "my-spinner"); // string shorthand: (content, className)

Skeletons.Note({ className: `${fig}__submit-btn`, content: LOCALE.SUBMIT, service: "my-submit", uiHandler: [ui] });

Skeletons.Note({ className: `${fig}__label`, content: ui.mget("label"), styleOpt: { background: ui.mget("color") } });
```

---

#### `Skeletons.Entry`

Single-line text input.

| Prop | Description |
|------|-------------|
| `placeholder` | Placeholder text |
| `value` | Initial value |
| `name` | Input `name` attribute |
| `require` | Validation type (`"email"`, `"text"`) |
| `mode` | `"commit"` triggers service on Enter |
| `formItem` | Model key for form binding |
| `interactive` | `1` for interactive mode |
| `preselect` | `1` to select all on focus |
| `errorHandler` | Widget receiving validation errors |

```javascript
Skeletons.Entry({
  className: `${fig}__entry`, placeholder: LOCALE.MY_PLACEHOLDER,
  require: "email", mode: "commit", service: "my-submit",
  sys_pn: "my-input", uiHandler: [ui],
});
```

Read values in `onUiEvent` via `this.getData(_a.formItem)` or `ensurePart("my-input").then(p => p.el.querySelector("input")?.value?.trim())`.

---

#### `Skeletons.EntryBox`

Extends `Entry` with richer validation: custom validators, inline error display, prefix icons, password toggle.

| Extra Prop | Description |
|------------|-------------|
| `validators` | Array of custom validation functions |
| `showError` | Show inline errors (default `true`) |
| `prefix` | Icon/element before input |
| `shower` | `1` to add password show/hide toggle |

```javascript
Skeletons.EntryBox({
  className: `${fig}__entry email`, sys_pn: "ref-email", formItem: "email",
  placeholder: LOCALE.EMAIL, require: "email", mode: "commit",
  service: "my-submit", interactive: 1, preselect: 1,
  uiHandler: [ui], errorHandler: ui,
  validators: myEmailValidators, showError: false, prefix: emailIcon,
});

Skeletons.EntryBox({
  className: `${fig}__password`, sys_pn: "ref-password",
  placeholder: LOCALE.PASSWORD, mode: "commit", service: "my-submit",
  shower: 1, uiHandler: [ui],
});
```

---

#### `Skeletons.Textarea`

Multi-line input. Inherits all `Entry` props plus:

| Extra Prop | Description |
|------------|-------------|
| `rows` | Visible row count |
| `ignoreEnter` | `true` allows newlines instead of submitting |
| `removeOnEscape` | `true` removes element on Escape |
| `volatility` | `1` to re-evaluate on changes |

```javascript
Skeletons.Textarea({
  className: `${fig}__input`, sys_pn: "entry", name: "my-field",
  value: ui.mget("my-field"), require: "any", mode: "commit",
  rows: ui.rowsCount(value), bubble: 0, volatility: 1,
  preselect: 1, ignoreEnter: true, removeOnEscape: true,
  uiHandler: [ui], partHandler: ui,
});
```

---

#### `Skeletons.Messenger`

Rich message input for chat interfaces. Combines text entry with send behavior, auto-focus, auto-clear, and optional file upload.

| Prop | Description |
|------|-------------|
| `mode` | `"commit"` to send on Enter |
| `autofocus` | `1` to auto-focus on render |
| `autoclear` | `1` to clear after sending |
| `no_upload` | `1` to disable file attachments |
| `content` | Pre-fill with existing content |

```javascript
Skeletons.Messenger({
  className: `${fig}__messenger`, sys_pn: "message",
  mode: "commit", service: "send",
  autofocus: 1, autoclear: 1, bubble: 0,
  content: ui.getStoredMessage(), dataset: { mode: "open" }, uiHandler: [ui],
});
```

---

#### `Skeletons.RichText`

Rich text editor/viewer with inline formatting, auto-linking, and tag support.

| Prop | Description |
|------|-------------|
| `role` | `"editor"` for write mode |
| `readwrite` | `1` to enable editing |
| `autofocus` | Focus on render |
| `autolink` | `1` to auto-linkify URLs |
| `tags` | Tag configuration |

```javascript
Skeletons.RichText({
  className: `${fig}__editor`, sys_pn: "text-content", name: "content",
  role: "editor", readwrite: 1, autofocus: 1, autolink: 1,
  placeholder: LOCALE.MY_PLACEHOLDER, service: "raise", tags,
});
```

---

#### `Skeletons.List.Smart / .Scroll / .Table`

| Variant | Purpose |
|---------|---------|
| `List.Smart` | Dynamic API-driven lists with spinner and empty state |
| `List.Scroll` | Static scrollable lists with styled scrollbar |
| `List.Table` | Tabular data |

Common props: `className`, `innerClass`, `flow` (`x`/`y`/`wrap`/`none`), `sys_pn`, `uiHandler`, `partHandler`, `kids`, `vendorOpt` (scrollbar styling), `dataset`.

`List.Smart` additional props:

| Prop | Description |
|------|-------------|
| `api` | Function fetching list data from server |
| `itemsOpt` | Template for every item (`{ kind, uiHandler }`) |
| `spinner` / `spinnerWait` | Loading spinner and delay (ms) |
| `evArgs` | Skeleton shown when list is empty |
| `start` | `"bottom"` to scroll to bottom on load |
| `axis` | Scroll axis: `x` or `y` |

```javascript
Skeletons.List.Smart({
  className: `${fig}__list`, sys_pn: "my-list",
  api: ui.getItems.bind(ui),
  itemsOpt: { kind: "my_item_widget", uiHandler: [ui] },
  spinner: true, spinnerWait: 500,
  vendorOpt: Preset.List.Orange_e,
  evArgs: Skeletons.Note(LOCALE.NO_ITEMS, "no-content"),
});

// Chat list scrolled to bottom
Skeletons.List.Smart({
  className: `${fig}__messages`, sys_pn: "messages",
  flow: "none", start: "bottom", uiHandler: [ui],
  api: ui.getCurrentApi,
  itemsOpt: { kind: "my_message_item", uiHandler: [ui] },
  spinner: true, spinnerWait: 500,
  evArgs: Skeletons.Note(LOCALE.NO_MESSAGES, "no-content"),
  vendorOpt: Preset.List.Orange_e,
});
```

Default `vendorOpt` scrollbar: `{ alwaysVisible: true, size: "2px", opacity: "1", color: "#FA8540", distance: "2px", railColor: "#E5E5E5" }`.

---

#### `Skeletons.FileSelector`

Opens the browser's native file picker.

| Prop | Description |
|------|-------------|
| `accept` | File type filter (e.g. `"image/*"`, `".pdf,.docx"`) |
| `service` | Service triggered when file is selected |
| `bubble` | `0` to prevent event bubbling |

```javascript
Skeletons.FileSelector({ sys_pn: "my-selector", accept: ".pdf,.docx", service: "my-action", bubble: 0, partHandler: ui, uiHandler: [ui] });
```

Access the file in `onPartReady`:
```javascript
onPartReady(child, pn) {
  if (pn === "fileselector") {
    child.el.onchange = (e) => { const file = e.target.files[0]; /* ... */ };
  }
}
```

---

#### `Skeletons.Avatar`

Renders a user avatar as background-image or color-generated placeholder.

```javascript
Skeletons.Avatar(ava, cn, name);
// ava: image URL or "default" (generates HSL color from name)
// cn:  CSS class
// name: user's name

Skeletons.Avatar(ui.mget(_a.avatar) || "default", `${fig}__avatar`, ui.mget(_a.name));
```

---

#### `Skeletons.Profile` / `Skeletons.UserProfile`

`Profile` — generic entity avatar. `UserProfile` — Drumee user accounts only (adds `auto_color`, `live_status`, `online`).

| Prop | Description |
|------|-------------|
| `id` | User/entity ID for fetching profile data |
| `type` | Display variant (e.g. `"thumb"`) |
| `firstname` / `lastname` / `fullname` | Name fields |
| `live_status` | `1` to show online/offline indicator (UserProfile only) |
| `auto_color` | `1` to generate color from name (UserProfile only) |

```javascript
Skeletons.UserProfile({
  className: `${fig}__avatar`, id: ui.mget("uid"),
  firstname: ui.mget("firstname"), lastname: ui.mget("lastname"),
  online: ui.mget("online"), live_status: 1,
});
```

---

#### `Skeletons.Image.Smart / .Svg`

| Variant | Use case |
|---------|---------|
| `Image.Smart` | Photos, covers, backgrounds — low/high resolution |
| `Image.Svg` | SVG icons (non-interactive; use `Button.Svg` for clickable icons) |

```javascript
Skeletons.Image.Smart({ className: `${fig}__cover`, low: item.coverUrl, high: item.coverUrl });

Skeletons.Image.Svg({ ico: "my-icon", className: `${fig}__icon` });
```

---

#### `Skeletons.Progress`

Progress indicator for uploads, downloads, or long-running operations.

| Prop | Description |
|------|-------------|
| `loader` / `client` / `listener` | Widget driving progress |
| `name` / `filename` | Display name; defaults to `loader.get(filename)` |

```javascript
Skeletons.Progress({ loader: ui, name: ui.mget("filename"), className: `${fig}__progress`, sys_pn: "my-progress" });
```

---

#### `Skeletons.Wrapper.X / .Y`

Dialog/overlay container. Automatically appends `dialog__wrapper` class, auto-generates `sys_pn` from `name` (`wrapper-{name}`), and auto-hides when `kids` is empty.

```javascript
Skeletons.Wrapper.Y({ className: `${fig}__overlay`, name: "overlay" });
// → sys_pn = "wrapper-overlay"

Skeletons.Wrapper.Y({ className: `${fig}__context`, name: "context", uiHandler: [ui], partHandler: ui });
```

---

### MFS (Media File System)

#### Initialization

```javascript
// initData() — called after model data is ready
this.model.set(data);
this.initData();  // computes age/date/size, sets isMfs/isHub/isFolder/isHubOrFolder flags
this.initURL();

// unselect() — abstract, must be implemented by subclasses that support selection
unselect(mode) { this.setState(0); this.el.removeAttribute("data-selected"); }
```

Type flags set by `initData()`: `isMfs`, `isHubOrFolder`, `isHub`, `isFolder`.

#### Metadata methods

| Method | Returns | Description |
|--------|---------|-------------|
| `metadata()` | Object | Reads/parses model `metadata` field; flattens `md5Hash`, `dataType` onto model |
| `copyPropertiesFrom(src)` | void | Copies filesystem props from another node (skips falsy values) |
| `fullname()` | String | Combines `filename` + `ext` into complete filename |

#### Node identity methods

| Method | Returns | Description |
|--------|---------|-------------|
| `getCurrentNid()` | number | Current dir nid: folder→own id, hub→0, file→parent id |
| `getHostName()` | string | Virtual hostname where files are served |
| `getHostId()` | string | Hub ID owning the node |
| `isRegularFile()` | boolean | `true` if not hub/folder and not symlink |
| `isSymLink()` | boolean | `true` if symlink flag set AND not a hub |

#### Link generation

| Method | Async | Description |
|--------|-------|-------------|
| `url(format?)` | No | Display URL (thumbnail by default, original for vectors) |
| `directUrl()` | No | Direct file href; `null` if not a regular file |
| `srcUrl()` | No | `protocol://vhost+ownpath` for `src` attributes; `null` if not regular file |
| `viewerLink(format?, e?)` | Yes | Shareable desk viewer URL; handles private/share/dmz/public areas |
| `pluginUrl()` | No | Plugin endpoint URL |
| `svcUrl(o)` | No | Signed zip download URL from key-value params |

#### File download methods

| Method | Description |
|--------|-------------|
| `download(o)` | Main entry point; delegates to `download_tree()` for hubs/folders or `fetchFile()` for files |
| `download_tree()` | Zips hub/folder via `postService(SERVICE.media.download, ...)` |
| `download_zip(o)` | Downloads pre-built zip (`o.zipid`, `o.zipname`, `o.progress`) |
| `fetchFile(o)` | Streams `o.url`; reports progress to `o.progress`; emits `eod` event on completion |
| `abortDownload()` | Cancels in-flight `fetchFile` |
| `getBlob(blob, filename)` | Triggers browser download from Blob |
| `getFromUrl(url)` | Direct browser download from plain URL (no progress tracking) |

#### Media state methods

| Method | Description |
|--------|-------------|
| `markAsSeen()` | Notifies server user viewed the node (skips hubs/folders and DMZ sessions) |
| `syncAttributes()` | Fetches latest node attributes from server and updates local model |

#### Permission methods

All return truthy/falsy based on the node's `privilege` bitmask (`_K.permission.*` constants).

| Method | Permission bit | Extra guard |
|--------|---------------|-------------|
| `isGranted(permission)` | any `_K.permission.*` bit | Base check — all helpers delegate to this |
| `isMediaOwner()` | `owner` | — |
| `canAdmin()` | `admin` | — |
| `canOrganize()` | `modify` | Not a non-hub symlink |
| `canUpload()` | `write` | Not a non-hub symlink |
| `canShare()` | `download` | Area must be `dmz` or `share` |
| `canManageAccess()` | `admin` | Area must be `private` |
| `canRemove()` | `modify` | Node must not be `locked` |
| `canDownload()` | `download` | — |

```javascript
if (this.canUpload()) { /* show upload button */ }
if (this.canManageAccess()) { /* show access manager */ }
```

---

### Socket / HTTP Utilities

#### `xhRequest(url, opt?)`

Low-level GET request. Service paths like `"media.get_node_attr"` are auto-prefixed with the bootstrap `svc` base URL.

| Parameter | Description |
|-----------|-------------|
| `url` | Full URL or service path |
| `opt.responseType` | `"json"` (default, returns object with `__status`), `"text"` (raw string), other (raw XHR) |

```javascript
xhRequest(fileUrl, { responseType: "text" }).then((content) => this.load(content));
xhRequest("my_module.get_data", { uid }).then((data) => { this._data = data; });
```

#### `uploadFile(file, params)`

Uploads a file via XHR with binary transport. Returns the XHR instance (call `.abort()` to cancel).

File metadata is encoded in `x-param-xia-data` header as JSON: `filename`, `mimetype`, `filesize`, `socket_id`, plus any extra params.

Default service: `media.upload` (override via `params.service`).

Widget event hooks bound automatically: `onAbort`, `onUploadProgress`, `onUploadError`, `onLoad`, `onUploadEnd`, `onReadystatechange`.

```javascript
const xhr = this.uploadFile(file, { hub_id: this.getHostId(), nid: this.getCurrentNid() });
// xhr.abort() to cancel
```

#### `sendTo(target, e, p, token)` / `_sendTo(target, items, p, token)`

Public entry for drag-and-drop uploads. Extracts transferable items from the drop event and wraps files/folders in `pseudo_media` instances before calling `target.insertMedia(...)`.

#### Internal utilities (used by `fetchService`/`postService`)

| Function | Purpose |
|----------|---------|
| `makeHeaders(params?, xhr?)` | Builds auth + device headers |
| `makeOptions(params?)` | Builds full fetch init object |
| `preparePayload(...args)` | Resolves service name + payload from flexible input |
| `sanitize(opt)` | Strips `widgetId`, `uiHandler`, `partHandler`, `errorHandler` |
| `handleResponse(view, response)` | Parses JSON, dispatches via `__dispatchRest`, calls `onServerComplain` on errors |
| `setAuthorization(key, value)` | Stores session token; pass `null` to remove |

---

## Key Patterns

- **Event bus**: `RADIO_BROADCAST` for app-wide messaging (responsive layout, auth events)
- **Feature flags/services**: `SERVICE` object (e.g., `SERVICE.isOnboardingComplete()`)
- **Access control**: `_K.permission.*` bitmask constants; use `isGranted(permission)`, `canUpload()`, `canAdmin()` etc. on MFS nodes
- **Window manager**: `Wm` API for multi-window Z-ordering
- **Domain-aware routing**: different behavior for `home.domain` vs `www.domain` subdomains
- **Path aliases**: use the 40+ webpack aliases instead of relative paths across module boundaries. Key aliases: `builtins`, `desk`, `dmz`, `editor`, `lex`, `locale`, `media`, `player`, `skeleton`, `skin`, `toolkit`, `widget`, `window`, `welcome`
- **Internationalization**: always use `LOCALE.*` for user-visible strings; add new keys to `locale/en.json` (and other locale files)

---

## Plugin Development

Plugins are standalone webpack bundles that register widget kinds into the Kind registry at runtime. The host loads them on demand — no compile-time coupling.

### Plugin structure

```
my-plugin/
├── package.json          # name: '@drumee/my-plugin', main: 'lib/index.js'
├── webpack.js
└── src/
    ├── index.js          # bootstrap — registers addons on drumee events
    ├── seeds.js          # kind name → dynamic import map
    └── widgets/my-router/
        ├── index.js
        ├── skin/
        └── skeleton/
```

### `src/seeds.js`

```javascript
module.exports = {
  'my_plugin_router': import('./widgets/my-router'),
};
```

Kind names use `snake_case` and must match the widget class name exactly.

### `src/index.js`

```javascript
const { loadWidgets } = require('@drumee/ui-toolkit');
loadWidgets();

function start() {
  Kind.registerAddons(require('./seeds'));
}

if (document.readyState === 'complete') {
  start();
} else {
  document.addEventListener(location.hash ? 'drumee:plugins:ready' : 'drumee:router:ready', start);
}
```

### Widget class

```javascript
class my_plugin_router extends LetcBox {
  initialize(opt = {}) {
    super.initialize(opt);
    this.declareHandlers();
  }
  async onDomRefresh() {
    this.feed({ kind: 'my_plugin_form' });
  }
}
module.exports = my_plugin_router;
```

All globals (`LetcBox`, `Kind`, `Visitor`, `LOCALE`, `_a`, `SERVICE`, `Skeletons`, etc.) are injected by the host — no imports needed.

### Loading a plugin from a host module

```javascript
async loadMyFeature() {
  const loadDefault = () => this.feed({ kind: 'builtin_fallback' });
  let plugins = Platform.get('plugins');
  if (!plugins?.my_feature) return loadDefault();
  const { name, kind } = plugins.my_feature;
  if (Kind.get(kind)) return this.feed({ kind }); // already registered
  try {
    await Kind.loadPlugin({ name, kind });
    await Kind.waitFor(kind);
    this.feed({ kind });
  } catch (e) {
    loadDefault();
  }
}
```

Plugin communicates upward via `this.triggerHandlers({ service: '...' })` — the host handles it in `onUiEvent` like any built-in widget.
