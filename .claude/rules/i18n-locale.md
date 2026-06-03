---
paths:
  - "locale/**/*.json"
  - "letc/**"
---

# i18n / Locale

Managing the locale files. The "never hardcode text, use `LOCALE.*`" rule that applies to code everywhere is always-on in `framework-invariants.md` §5 — this file is the workflow for adding/maintaining the keys it references.

## Rules

- Keys are **UPPERCASE** (`SEND`, `NO_FILES_YET`) — match existing `locale/en.json` style.
- New key → add to `locale/en.json` first, then mirror into **every** other lang file (es, fr, ru, km, zh).
- Missing/wrong-case keys resolve to `''` via `createSafeObject` — a typo shows blank instead of erroring, so verify the key exists.
- Key names: descriptive, consistent with siblings; never reuse one key for two meanings.
- When only adding a key, don't reorder/reformat the whole file — keep the diff reviewable.

## Good / Bad

- ❌ `Skeletons.Note({ content: "No files yet" })`
- ✅ `Skeletons.Note({ content: LOCALE.NO_FILES_YET })` + `NO_FILES_YET` added to all locale files.
