---
paths:
  - "locale/**/*.json"
  - "src/drumee/**/locale.json"
  - "letc/**"
---

# i18n / Locale

Managing the locale files. The "never hardcode text, use `LOCALE.*`" rule that applies to code everywhere is always-on in `framework-invariants.md` §5 — this file is the workflow for adding/maintaining the keys it references.

**Not for CLI code:** `letc/builder.js` is a Node CLI (run by `add-widget`); its `console.log`/`usage`/`fatal` strings can't read the browser `LOCALE` — leave them as plain text. This workflow covers UI text and locale key maps, not build/CLI implementation.

## Rules

- Keys are **UPPERCASE** (`SEND`, `NO_FILES_YET`) — match existing `locale/en.json` style. **Exception:** language-code / mixed-case label keys (`en`, `fr`, `km`, `en_GB`, `QnA`) are looked up dynamically via `LOCALE[code]` (e.g. the language selector) — keep their existing casing, don't uppercase them.
- New key (root `locale/`) → add to `locale/en.json` first, then mirror into **every** other lang file (es, fr, ru, km, zh).
- **Local `**/locale.json` bundles** (e.g. `window/move/locale.json`) are single self-contained key maps, *not* part of the root multi-language set — add/update keys **in that one file in place**; don't mirror them into root `locale/` or create sibling language files.
- Missing/wrong-case keys resolve to `''` via `createSafeObject` — a typo shows blank instead of erroring, so verify the key exists.
- Key names: descriptive, consistent with siblings; never reuse one key for two meanings.
- When only adding a key, don't reorder/reformat the whole file — keep the diff reviewable.

## Good / Bad

- ❌ `Skeletons.Note({ content: "No files yet" })`
- ✅ `Skeletons.Note({ content: LOCALE.NO_FILES_YET })` + `NO_FILES_YET` added to all locale files.
