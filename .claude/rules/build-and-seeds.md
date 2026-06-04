---
paths:
  - "webpack/**"
  - "webpack.js"
  - "src/drumee/seeds.js"
  - "src/drumee/**/seeds.js"
  - "letc/**"
---

# Build & Seeds

## `seeds.js` maps Kind → import (hand-maintained source)

- **Root `src/drumee/seeds.js`** is the **runtime Kind registry** — `index.web.js` does `Kind.registerAddons(require('./seeds'))`. Each entry maps a Kind key → `import()` of its folder. To register a new widget/window **for the app, edit this file** (hand-maintained, edited directly — not generated).
- **Nested `**/seeds.js`** (e.g. `modules/desk/workspace-indicator/seeds.js` → `{ 'desk_workspaceIndicator': '.' }`) are **string-valued** maps used only for *documentation* generation — they are **not** registered by the root runtime path. Editing a nested seeds.js does **not** register a kind for the app.
- Kind key = whatever the entry registers. It *often* equals the class name minus leading underscores, but **not always** — e.g. `audio_player` → `builtins/player/audio` though the class is `__player_audio`. Don't infer the key from the class name (see `framework-invariants.md` §2).

## Class names are load-bearing

- Kind lookup is by class name string. Terser runs `mangle: true`, but `keep_classnames` + `keep_fnames` (`webpack.js`) preserve the names lookup needs. ❌ don't remove those `keep_*` options; don't rename a class without updating seeds + kind refs + CSS prefix together.

## Imports

- (Bundled **app code** only.) Use webpack path aliases across module boundaries — not deep relative paths. `webpack/resolve.js` is the authoritative alias→path map (verified ones include `builtins`, `widget`, `window`, `media`, `player`, `lex`, `locale`, `skin`, `desk`, `dmz`, `welcome`). Check it before using an alias — some names listed in CLAUDE.md (e.g. `skeleton` → missing `libs/skeleton`, `toolkit` → use `ui-toolkit`) don't resolve here.
- The Node build scripts themselves (`webpack/**`, `letc/**` — `#!/usr/bin/env node`) run **before** webpack's resolver; they use relative `require`. Don't convert those to aliases.

## Dependencies

- A new runtime lib must be bundled — only framework globals are injected; third-party libs are not.
