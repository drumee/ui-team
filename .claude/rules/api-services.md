---
paths:
  - "src/drumee/api.js"
  - "src/drumee/api/**/*.js"
  - "src/drumee/lex/services.json"
  - "src/drumee/lex/*.js"
---

# API & Services

Utilities detail: CLAUDE.md → "Socket / HTTP Utilities".

> The "use `fetchService`/`postService`, never raw `fetch`" rule is always-on — see `framework-invariants.md` §6. It applies at every call site (`builtins/**`, `modules/**`), not just here. This file covers the lexicon + services map those calls depend on.

## Service names

- Endpoint names come from `SERVICE.*` at runtime. ❌ hardcoded URL strings in **consumers** — look up the `ns.method` entry instead.
- **`SERVICE` is built at bootstrap, not from the static file.** `drumee.js` does `window.SERVICE = _.merge({}, require('lex/services'), Platform.get('services'))`. `Platform.get('services')` comes from the backend `yp.get_env` RPC (the XHR in `drumee.js` → `Platform.set(platform)`) and is merged **on top**, so the backend's map is authoritative and wins on any conflict.
- **`src/drumee/lex/services.json` is only a local placeholder / fallback** — the subset available before `yp.get_env` returns. Don't treat it as the source of truth: editing it does **not** add a server endpoint, and a service's presence/absence here doesn't determine whether the backend exposes it. The backend defines the real service surface.
- **Exception:** `src/drumee/api.js` is the bootstrap that *builds* the endpoint paths (`endpointPath`, `servicePath`, `websocketPath`, `serviceApi`) before `SERVICE.*` exists — its URL strings are load-bearing, leave them. The hardcoded-URL ban targets service consumers, not this initializer.

## Errors

- Server errors dispatch to `onServerComplain(...)` on the calling widget — handle there, don't swallow them silently.

## Lexicon files (`lex/*.js`)

- `_a` attributes, `_e` events, `_K` constants. Add a constant here rather than scattering string literals across widgets.
- A new server endpoint is defined by the **backend** and arrives via `yp.get_env` (`Platform.get('services')`) — adding it to `services.json` does not create it. Only add an `ns.method` entry to the `services.json` placeholder when the local fallback genuinely needs it before bootstrap completes.
