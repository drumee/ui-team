---
paths:
  - "src/sass/**/*.scss"
  - "src/drumee/**/skin/**/*.scss"
  - "**/*.scss"
---

# SCSS / Styling

Naming detail: CLAUDE.md → "CSS class naming conventions".

## BEM root = fig.family

- Block = the widget's `fig.family` (e.g. `chat-hub`); elements `chat-hub__title`; state via `&[data-state="1"]`.
- ❌ inventing selectors that don't match a widget's `fig.family` — JS assigns classes from the class name, so mismatched CSS silently never applies.

## Tokens, not literals

- Pull colors / spacing / typography from `src/sass/settings/maps.scss` + helpers. ❌ hardcoded hex or magic px when a token exists.
- Shared mixins/vars resolve via sass-loader `includePaths` (`src/drumee/skin/`): `@use 'mixins/drumee'` / `@use 'mixins/colors/index.scss'`, or a relative `@use '../../skin/...'`. There is no `skin:` colon-prefixed alias.

## Scope

- A widget's styles live in its own `skin/` dir. Global/shared styles only in `src/sass/`.
- Don't leak widget-specific rules into global stylesheets.
- Keep nesting shallow (≤ 3 levels).
