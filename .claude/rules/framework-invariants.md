# Framework Invariants (always apply)

Non-negotiable contracts. Breaking these causes runtime failures that webpack will NOT catch. Full detail in repo-root `CLAUDE.md`.

## 1. Globals are injected — never `import`/`require`

`_a _e _K LOCALE SERVICE WARNING ERROR Skeletons Kind Preset Dayjs createSafeObject LetcBox DrumeeMFS LetcList LetcText Visitor Host Platform Organization Env` are all global at runtime (CLAUDE.md → "Runtime Globals").

- ❌ `import { Skeletons } from '@drumee/ui-core'`
- ✅ use `Skeletons` directly.

## 2. Class name = Kind = fig.family (one contract)

The constructor name drives four things at once:

- **Kind** registry key = class name minus leading underscores (snake_case).
- **`fig.family`** = that name with `_` → `-` (the BEM/CSS prefix).
- **folder path** matches the family.

```
class __chat_hub  →  kind "chat_hub"  →  fig.family "chat-hub"  →  css "chat-hub__*"  →  builtins/.../chat/hub/
```

Rename a class → you must update its seed entry, kind references, and CSS prefix together. Don't rename casually.

## 3. Terser `mangle` is DISABLED on purpose

Kind lookup is by class name string, so the build preserves names. Never enable mangling and never assume minification will rename a symbol.

## 4. UI is declarative — no raw HTML

Build DOM with `Skeletons.*` only. ❌ template-literal markup, `$('<div>')`, `innerHTML`, jQuery DOM construction.

## 5. All user-visible text via `LOCALE`

- ❌ `content: "Send"`
- ✅ `content: LOCALE.send` (and add the key to the locale files — see `i18n-locale.md`).
