---
paths:
  - "webpack/**"
  - "webpack.js"
  - "src/drumee/seeds.js"
  - "src/drumee/**/seeds.js"
---

# Build & Seeds

## `seeds.js` maps Kind → import (hand-maintained source)

- `seeds.js` files map each Kind key → `import()` of its folder. They are the **source of truth you edit directly** — to register a new widget/window, add its entry to the relevant `seeds.js` (root `src/drumee/seeds.js`, or a nested one such as `modules/desk/workspace-indicator/seeds.js`).
- `./webpack/seeds/index.js` (run by `npm run build`) **walks and consumes** every `seeds.js` to build documentation — it does **not** regenerate them, so your edits are authoritative and never overwritten.
- Kind key = whatever the `seeds.js` entry registers. It *often* equals the class name minus leading underscores, but **not always** — e.g. `audio_player` → `builtins/player/audio` though the class is `__player_audio`. Don't infer the key from the class name (see `framework-invariants.md` §2).

## Class names are load-bearing

- Kind lookup is by class name string. Terser runs `mangle: true`, but `keep_classnames` + `keep_fnames` (`webpack.js`) preserve the names lookup needs. ❌ don't remove those `keep_*` options; don't rename a class without updating seeds + kind refs + CSS prefix together.

## Imports

- Use the webpack aliases (`builtins`, `widget`, `window`, `media`, `player`, `skeleton`, `skin`, `lex`, `locale`, `toolkit`, `desk`, `dmz`, `welcome` …) across module boundaries — not deep relative paths (CLAUDE.md → "Path aliases").

## Dependencies

- A new runtime lib must be bundled — only framework globals are injected; third-party libs are not.
