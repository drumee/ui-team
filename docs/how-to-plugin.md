# Writing and Loading a UI Plugin

A Drumee UI plugin is a standalone webpack bundle that registers one or more widget kinds into the Kind registry at runtime. The host app (`ui-team`) loads the bundle on demand and renders the plugin widget by kind name — with no compile-time coupling.

The `@drumee/signin` plugin is the canonical reference implementation.

---

## How a Plugin is Loaded

```
Platform.get('plugins')  →  { signin: { name: '@drumee/signin', kind: 'signin_router' } }
         ↓
Kind.loadPlugin({ name, kind })
         ↓  fetches SERVICE.bootstrap.plugin  →  { path: 'https://.../signin-[hash].js' }
         ↓  loadJS(data.path)  →  <script> injected
         ↓  plugin's src/index.js runs  →  Kind.registerAddons(seeds)
         ↓  'addons:registered' event fires
Kind.waitFor(kind)  →  resolves
this.feed({ kind })  →  plugin widget renders
```

If `Platform.get('plugins')` is absent or the plugin fails to load, the host module falls back to its built-in implementation.

---

## Plugin Repository Structure

```
my-plugin/
├── package.json            # name: '@drumee/my-plugin', main: 'lib/index.js'
├── webpack.js              # entry: src/, output: lib/
├── webpack/
│   ├── module.js
│   ├── plugins.js
│   └── resolve.js
└── src/
    ├── index.js            # bootstrap — listens for drumee events, calls Kind.registerAddons
    ├── seeds.js            # widget kind → dynamic import map
    ├── locale/             # optional i18n files
    └── widgets/
        └── my-router/
            ├── index.js    # main widget class
            ├── skin/       # SCSS
            └── skeleton/   # UI composition functions
```

Copy the structure from `@drumee/signin` as a starting template.

---

## Step 1 — `src/seeds.js`

Export a map of kind name → dynamic import. Every entry becomes a lazy-loaded widget in the Kind registry.

```javascript
module.exports = {
  'my_plugin_router': import('./widgets/my-router'),
  'my_plugin_form':   import('./widgets/my-form'),
};
```

Rules:
- Kind names use `snake_case`.
- Each kind must correspond to a class whose constructor name matches exactly (see §Widget Class below).
- There is no limit on the number of kinds a plugin may register.

---

## Step 2 — `src/index.js`

Bootstrap the plugin. Listen for the host's ready event, then register seeds.

```javascript
const { loadWidgets } = require('@drumee/ui-toolkit');
loadWidgets();

function start() {
  Kind.registerAddons(require('./seeds'));
}

if (document.readyState === 'complete') {
  start();
} else {
  if (location.hash) {
    document.addEventListener('drumee:plugins:ready', start);
  } else {
    document.addEventListener('drumee:router:ready', start);
  }
}
```

`Kind.registerAddons` stores each dynamic import promise in the Addons registry under its kind name. The host's `Kind.waitFor(kind)` resolves once the matching promise settles.

---

## Step 3 — Widget Class

The class name must match the kind name, with `snake_case` used directly.

```javascript
// src/widgets/my-router/index.js
require('./skin');   // load SCSS

class my_plugin_router extends LetcBox {

  initialize(opt = {}) {
    super.initialize(opt);
    this.declareHandlers();
    this.mset({ flow: _a.y });

    // Optionally extend LOCALE with plugin-specific strings
    try {
      LOCALE.extend(require('../../locale')('en'));
    } catch (e) {
      LOCALE = { ...LOCALE, ...require('../../locale')(Visitor.language()) };
    }
  }

  async onDomRefresh() {
    this.feed({ kind: 'my_plugin_form' });
  }

  async onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.get(_a.service);
    switch (service) {
      case 'done':
        // handle completion
        break;
      default:
        super.onUiEvent && super.onUiEvent(cmd, args);
    }
  }
}

module.exports = my_plugin_router;
```

Key points:
- Extend `LetcBox` for standard widgets; extend `DrumeeMFS` only for media filesystem nodes.
- Call `this.declareHandlers()` in `initialize` if the widget will handle `uiHandler` / `partHandler` events from children.
- All globals (`LetcBox`, `Kind`, `Visitor`, `LOCALE`, `_a`, `SERVICE`, `Skeletons`, etc.) are injected by the host — no imports needed.

---

## Step 4 — `package.json`

```json
{
  "name": "@drumee/my-plugin",
  "version": "1.0.0",
  "main": "lib/index.js",
  "scripts": {
    "dev":    "drumee-ui-devel",
    "stage":  "drumee-ui-devel stage",
    "deploy": "drumee-ui-deploy"
  },
  "dependencies": {
    "@drumee/ui-styles":  "^1.0.1",
    "@drumee/ui-toolkit": "^0.0.17"
  },
  "devDependencies": {
    "@drumee/ui-dev-tools": "^1.0.16"
  }
}
```

The `main` field points to the compiled output. The webpack entry is `src/index.js`; the output bundle goes to `lib/`.

---

## Step 5 — Build and Deploy

```bash
npm run dev      # development build with watch
npm run stage    # staging build
npm run deploy   # production build + remote sync
```

The deploy step publishes the bundle to a URL the server knows about. The server returns that URL when the host queries `SERVICE.bootstrap.plugin`.

---

## Step 6 — Register the Plugin in Platform Config

The server sets `Platform.get('plugins')` at bootstrap time (typically injected into the HTML or returned as part of `yp.get_env`). Add your plugin entry:

```json
{
  "plugins": {
    "my_feature": {
      "name": "@drumee/my-plugin",
      "kind": "my_plugin_router"
    }
  }
}
```

- `name` — npm package name, used by `SERVICE.bootstrap.plugin` to locate the bundle.
- `kind` — the root widget kind the host will instantiate via `this.feed({ kind })`.

---

## Step 7 — Load the Plugin from a Host Module

In any host module method (e.g., a route handler in `welcome/index.js`):

```javascript
async loadMyFeature() {
  // Fallback if plugin unavailable
  const loadDefault = () => this.feed({ kind: 'builtin_fallback' });

  let plugins = Platform.get('plugins');
  try {
    if (_.isString(plugins)) plugins = JSON.parse(plugins);
  } catch (e) {
    return loadDefault();
  }

  if (!plugins?.my_feature) return loadDefault();

  const { name, kind } = plugins.my_feature;

  // Skip load if already registered (e.g., navigated back)
  if (Kind.get(kind)) return this.feed({ kind });

  try {
    await Kind.loadPlugin({ name, kind });
    await Kind.waitFor(kind);
    this.feed({ kind });
  } catch (e) {
    loadDefault();
  }
}
```

---

## Communication Between Plugin and Host

The plugin widget communicates upward via `triggerHandlers` and the `uiHandler` prop — exactly like any built-in widget. The host does not need to know whether a widget came from a plugin or the main bundle.

```javascript
// Inside plugin widget — bubble an event up to the host
this.triggerHandlers({ service: 'my-plugin-done', data: result });

// Host module — handles it in onUiEvent like any other event
onUiEvent(cmd, args = {}) {
  const service = args.service || cmd.get(_a.service);
  switch (service) {
    case 'my-plugin-done':
      // act on args.data
      break;
  }
}
```

---

## Checklist

- [ ] `src/seeds.js` maps kind names to dynamic imports
- [ ] `src/index.js` listens for `drumee:plugins:ready` / `drumee:router:ready` and calls `Kind.registerAddons`
- [ ] Widget class name matches kind name exactly
- [ ] `package.json` `main` points to compiled output (`lib/index.js`)
- [ ] Bundle deployed and server configured to return its URL for `SERVICE.bootstrap.plugin`
- [ ] `Platform.get('plugins')` entry added with correct `name` and `kind`
- [ ] Host module calls `Kind.loadPlugin` → `Kind.waitFor` → `this.feed({ kind })` with a fallback
