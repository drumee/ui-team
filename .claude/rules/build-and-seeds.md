---
paths:
  - "webpack/**"
  - "webpack.js"
  - "src/drumee/seeds.js"
---

# Build & Seeds

## `seeds.js` is generated

- `src/drumee/seeds.js` is produced by the `seed-letc` bin / webpack `seeds/`. ❌ do not hand-edit — add the widget/window folder + class, then regenerate. Manual edits get overwritten.
- Kind key = class name minus leading underscores (snake_case) → `import()` of its folder.

## Class names are load-bearing

- Terser `mangle` is disabled on purpose: Kind lookup is by class name. Don't enable mangling; don't rename a class without updating seeds + kind refs + CSS prefix together.

## Imports

- Use the webpack aliases (`builtins`, `widget`, `window`, `media`, `player`, `skeleton`, `skin`, `lex`, `locale`, `toolkit`, `desk`, `dmz`, `welcome` …) across module boundaries — not deep relative paths (CLAUDE.md → "Path aliases").

## Dependencies

- A new runtime lib must be bundled — only framework globals are injected; third-party libs are not.
