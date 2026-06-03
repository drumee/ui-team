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

- Endpoint names come from `SERVICE.*` (services.json merged with `Platform`). ❌ hardcoded URL strings in **consumers** — add/look up the `ns.method` entry instead.
- **Exception:** `src/drumee/api.js` is the bootstrap that *builds* the endpoint paths (`endpointPath`, `servicePath`, `websocketPath`, `serviceApi`) before `SERVICE.*` exists — its URL strings are load-bearing, leave them. The hardcoded-URL ban targets service consumers, not this initializer.

## Errors

- Server errors dispatch to `onServerComplain(...)` on the calling widget — handle there, don't swallow them silently.

## Lexicon files (`lex/*.js`)

- `_a` attributes, `_e` events, `_K` constants. Add a constant here rather than scattering string literals across widgets.
- Adding a service → add it to `services.json` in `ns.method` shape.
