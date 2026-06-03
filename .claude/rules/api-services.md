---
paths:
  - "src/drumee/api/**/*.js"
  - "src/drumee/lex/services.json"
  - "src/drumee/lex/*.js"
---

# API & Services

Utilities detail: CLAUDE.md → "Socket / HTTP Utilities".

## Calling the server

- Use `this.fetchService(SERVICE.ns.method, payload)` (GET) / `this.postService(SERVICE.ns.method, payload)` (POST).
- ❌ raw `fetch` / `$.ajax` — they bypass auth injection, `socket_id`, device headers, and the error dispatcher.
- Endpoint names come from `SERVICE.*` (services.json merged with `Platform`). ❌ hardcoded URL strings.

## Errors

- Server errors dispatch to `onServerComplain(...)` on the calling widget — handle there, don't swallow them silently.

## Lexicon files (`lex/*.js`)

- `_a` attributes, `_e` events, `_K` constants. Add a constant here rather than scattering string literals across widgets.
- Adding a service → add it to `services.json` in `ns.method` shape.
