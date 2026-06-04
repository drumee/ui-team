---
paths:
  - "src/sass/**/*.scss"
  - "src/drumee/**/skin/**/*.scss"
  - "**/*.scss"
  - "**/*.scss.tpl"
---

# SCSS / Styling

Naming detail: CLAUDE.md → "CSS class naming conventions".

## BEM root — `fig.family` or `fig.group`

Every widget's root element gets **both** the group and the family class (the engine does `$el.addClass(`${group} ${family} ${group}__item ${group}__ui ${family}__ui`)`). So there are two valid BEM roots, picked by *intended scope*:

- **`fig.family`** (e.g. `.chat-hub`, `.player-schedule`) — styles for **that one widget**. Elements `.chat-hub__title`; state via `&[data-state="1"]`. This is the default; use it for widget-specific styling.
- **`fig.group`** (e.g. `.player`, `.window`) — styles **shared across every widget in the group**, because all of them carry the bare `{group}` and `{group}__ui` / `{group}__item` classes. e.g. `.player { &__ui { … } }` in `player/skin/index.scss` applies to *all* players; a single player then refines via its own `.player-schedule` root. Use the group root only for genuinely shared rules, not as a shortcut to style one widget.

❌ inventing selectors that match neither the widget's `fig.group` nor its `fig.family` — JS assigns classes from the class name, so mismatched CSS silently never applies. Check the class name (and any `figName` override, see `framework-invariants.md` §2) to know the real group/family.

## Tokens, not literals

- Pull colors / spacing / typography from `src/sass/settings/maps.scss` + helpers. ❌ hardcoded hex or magic px when a token exists.
- Shared mixins/vars resolve via sass-loader `includePaths` (`src/drumee/skin/`): `@use 'mixins/drumee'` / `@use 'mixins/typo'` (real files under `skin/mixins/`), or a relative `@use '../../skin/...'`. There is no `skin:` colon-prefixed alias.

## Scope

- A **widget's** styles live in its own `skin/` dir. App-wide page styles go in `src/sass/`; the shared Sass library in `src/drumee/skin/` (`mixins/`, `lib/`, `vars/`) is also global and load-bearing (imported via `includePaths`) — edit it for shared mixins/tokens, don't relocate it to `src/sass/`.
- Don't leak widget-specific rules into global stylesheets.
- Keep nesting shallow (≤ 3 levels).
