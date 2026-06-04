# Framework Invariants (always apply)

Non-negotiable contracts. Breaking these causes runtime failures that webpack will NOT catch. Full detail in repo-root `CLAUDE.md`.

## 1. Globals are injected — never `import`/`require`

`_a _e _K LOCALE SERVICE WARNING ERROR Skeletons Kind Preset Dayjs createSafeObject LetcBox DrumeeMFS LetcList LetcText Visitor Host Platform Organization Env` are all global at runtime (CLAUDE.md → "Runtime Globals").

- ❌ `import { Skeletons } from '@drumee/ui-core'`
- ✅ use `Skeletons` directly.

**Exception:** the bootstrap code that *creates* these globals must require them — e.g. `drumee.js` `init_globals` does `require('lex/services')` to build `window.SERVICE`. The ban is for consumers, not the initializer.

## 2. Class name drives fig.family; seeds.js is authoritative for Kind

- **`fig.family`** is deterministic = class name minus leading underscores, `_` → `-` → also the BEM/CSS prefix. `class __chat_hub` → `fig.family "chat-hub"` → css `chat-hub__*`. **Exception:** a widget that sets `prototype.figName` overrides this — `class __account_entry` with `figName = "account_field"` → fig.family `"account-field"` → css `.account-field__*`. Check for a `figName` override before deriving the prefix from the class name.
- **Kind registry key** is whatever `src/drumee/seeds.js` registers. It *often* equals the class name minus underscores (`__window_folder` → `window_folder`), but **not always** — e.g. `class __player_audio` is registered as `audio_player` (reversed). Always check `seeds.js` for the real key; don't infer it.

```
class __chat_hub     →  fig.family "chat-hub"  →  css "chat-hub__*"  →  builtins/.../chat/hub/
class __window_folder → seeds key "window_folder"   (matches transform)
class __player_audio  → seeds key "audio_player"     (does NOT match — seeds wins)
```

Rename a class → update its seed entry, kind references, and CSS prefix together. Don't rename casually.

## 3. Class names survive minification — keep `keep_classnames` / `keep_fnames`

Kind lookup is by class name string. Terser runs with `mangle: true`, but `keep_classnames: true` + `keep_fnames: true` (`webpack.js`) preserve the names that lookup depends on. ❌ never drop those `keep_*` options — removing them breaks Kind resolution at runtime. Don't assume minification will rename a symbol.

## 4. UI is declarative — no raw HTML

Build DOM with `Skeletons.*` only. ❌ template-literal markup, `$('<div>')`, `innerHTML`, jQuery DOM construction.

**Exceptions** (the ban is for **new** UI components; these intentional raw-markup paths stay as-is):
- **Bootstrap / loader code** that runs before or around Skeletons — failover pages (`template/page/*.js` via `innerHTML` in `drumee.js`), SVG-sprite injection (`api/loader.js` `el.innerHTML = require('…/normalized.sprite.txt')`).
- **Legacy `*/template/*.js` markup modules** that return HTML/SVG strings — `media/template/icon.js`, `media/uploader/template/{row,grid}.js`, `widget/chat-item/template/*` (inserted via `innerHTML` / `$el.append` by their callers).
Maintain these in place; don't rewrite them to Skeletons.

## 5. All user-visible text via `LOCALE`

- ❌ `content: "Send"`
- ✅ `content: LOCALE.SEND` — locale keys are **UPPERCASE** (`locale/en.json` has `SEND`, `ADD`, … not `send`). A wrong-case/missing key renders blank (createSafeObject returns `THE_KEY_AS_STRING`), no error.
- New key → add to `locale/en.json` and mirror across all langs — see `i18n-locale.md`.
- **Exception:** the bootstrap error/failover pages (`template/page/*.js`, e.g. `403-en.js`/`403-fr.js`/`502.js`) hardcode language-specific literal copy on purpose — they render in the pre-locale failure path where `LOCALE` is an empty safe object (`drumee.js` sets `window.LOCALE = createSafeObject()`), so `LOCALE.*` would render blank there. Leave their literals.

## 6. Server calls via `fetchService` / `postService`

- ✅ `this.fetchService(SERVICE.ns.method, payload)` (GET) / `this.postService(...)` (POST).
- ❌ raw `fetch` / `$.ajax` / hardcoded URLs — they bypass auth, `socket_id`, device headers, and error dispatch. Service names come from `SERVICE.*`. (Detail: `api-services.md`, CLAUDE.md → "Socket / HTTP Utilities".)
- **Exception:** raw `fetch` for static/bundled **assets** (e.g. the PDFium wasm in `player/document/pdfium-wrapper.js`) is fine — the ban targets backend *service* calls, not asset loads.

## 7. WS handler signature — `onWsMessage(service, data, opts)`

The dispatcher (`router/websocket/index.js`) calls `onWsMessage(service, model, options)`. Switch on the **first arg**; never read the service out of `opts` (it's usually `{}`, so `opts || svc` silently skips every case). Applies to every WS handler wherever it lives — windows, modules, widgets. Lifecycle detail: `widget-development.md`.
