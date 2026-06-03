---
paths:
  - "locale/**/*.json"
  - "letc/**"
---

# i18n / Locale

Applies to locale files **and** any code that introduces user-visible text.

## Rules

- Never hardcode user-facing strings — reference `LOCALE.<key>`.
- New key → add to `locale/en.json` first, then mirror into **every** other lang file (es, fr, ru, km, zh).
- Missing keys resolve to `''` via `createSafeObject` — a typo shows blank instead of erroring, so verify the key exists.
- Key names: descriptive, consistent with siblings; never reuse one key for two meanings.
- When only adding a key, don't reorder/reformat the whole file — keep the diff reviewable.

## Good / Bad

- ❌ `Skeletons.Note({ content: "No files yet" })`
- ✅ `Skeletons.Note({ content: LOCALE.no_files_yet })` + `no_files_yet` added to all locale files.
