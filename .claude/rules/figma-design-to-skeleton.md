---
paths:
  - "**/skeleton/**/*.js"
  - "**/skeleton/**/*.coffee"
  - "src/drumee/**/skin/**/*.scss"
  - "src/sass/**/*.scss"
  - "locale/**/*.json"
  - "icons/src/**/*.svg"
---

# Figma → Skeleton (design-to-code rules)

Custom rules for the Figma MCP server when implementing a Figma design in **this** repo.
Drumee UI is **not** HTML/React — it is a JSON-based `Skeletons` component tree. The Figma
MCP tools (`get_design_context`, `get_figjam`, Code Connect) return HTML/React/Tailwind by
default; that output is a **reference only**, never paste it. Translate it to `Skeletons.*`.

Component contracts: CLAUDE.md → "Skeletons Component Reference". Non-negotiables:
`framework-invariants.md`. Per-surface detail: `skeleton-ui.md`, `styling-scss.md`,
`widget-development.md`, `i18n-locale.md`.

## Workflow (before generating anything)

1. Load the **`/figma-use`** skill before any `use_figma` write call (MANDATORY — Figma MCP).
2. Read the design: `get_design_context` **and** `get_screenshot` for the node. Use the
   screenshot as the visual target; treat the returned code as layout hints only.
3. Identify the **target widget**, don't invent one:
   - new widget → scaffold with `npm run add-widget -- --fig=group.name --dest src/path` and
     extend the right base (`LetcBox` / `DrumeeMFS` / `Marionette.View`, see `widget-development.md`).
   - existing widget → its `skeleton/` factory is the file to edit; `fig.family` is fixed
     (class name, or `figName` override — `framework-invariants.md` §2).
4. Map the Figma tree to Skeletons (table below), then style + localize + assets.

## Map Figma → `Skeletons.*` (never raw markup)

❌ HTML strings, `$('<div>')`, `innerHTML`, JSX, Tailwind classes, template-literal markup
(`framework-invariants.md` §4). ❌ `import { Skeletons } from …` — globals are injected (§1).
✅ use the `Skeletons` global and the builders in
`node_modules/@drumee/ui-core/letc/toolkit/skeleton/` (canonical source).

| Figma | Skeletons |
|-------|-----------|
| Auto-layout vertical / horizontal | `Skeletons.Box.Y` / `Box.X` |
| Grid / wrap layout | `Skeletons.Box.G` |
| Absolute / overlay layer | `Skeletons.Box.Z` |
| Icon-only button | `Skeletons.Button.Svg` |
| Icon + text button / menu item / checkbox | `Skeletons.Button.Label` |
| Fixed-size icon button | `Skeletons.Button.Icon` |
| Text / label | `Skeletons.Note` |
| Text input | `Skeletons.Entry` / `EntryBox` (multi: `Textarea`) |
| List / table / repeated cards | `Skeletons.List.Smart` / `List.Scroll` / `List.Table` (or `Box` + `populate`) |
| Avatar / profile chip | `Skeletons.Avatar` / `Profile` |
| Raster image (png/jpg) | `Skeletons.Image.Smart` or `Element({ tagName:'img' })` |
| Video / audio / source | `Skeletons.Element({ tagName:'video'\|'audio'\|'source' })` |

- **Don't set `display:flex` / `flex-direction`** in SCSS for Box nodes — `Box.Y/X/G/Z` set it.
  Translate Figma auto-layout *direction* by picking the Box variant, not by writing flex CSS.
- Wire interaction via `service` + `uiHandler:[ui]` (array) → `onUiEvent`; emit upward with
  `this.triggerHandlers({ service })`, never a direct `onUiEvent` call (`skeleton-ui.md`).

## Styling — tokens + BEM, no literals

- classNames derive from `ui.fig.family`: `const pfx = ui.fig.family` →
  `${pfx}__container` / `__section` / `__content`. Never hardcode the family string.
- Map Figma's color / spacing / typography to tokens in `src/sass/settings/maps.scss` +
  `@use 'mixins/drumee'` / `'mixins/typo'`. ❌ pasted hex / magic px when a token exists.
- A widget's styles live in its own `skin/`; selectors must match `fig.family` (or `fig.group`
  for shared rules) — mismatched selectors silently never apply (`styling-scss.md`).

## Text — `LOCALE`, never the Figma string

- Every visible label from the design → `content: LOCALE.KEY` (keys **UPPERCASE**). Add the key
  to `locale/en.json` and mirror to **all** langs (`i18n-locale.md`). ❌ `content: "Save"`.
- Exception: runtime/model data (`ui.mget(...)`) renders dynamic values, not locale keys.

## Assets — icon sprite pipeline, not inline SVG

- **SVG icons:** save the exported file to `icons/src/normalized/` (or `raw/`), run
  `npm run build:icons`, then reference by name: `Skeletons.Button.Svg({ ico:'icon-name' })`.
  ❌ don't paste `<svg>` markup into a skeleton or use a Figma `localhost`/data-URI for icons.
- **Raster images:** use the asset `src` via `Image.Smart` / `Element`. If Figma MCP returns a
  `localhost` source for a raster image, use that source directly (download/host it); only icons
  go through the sprite pipeline.

## Scope

- New files only at real boundaries (a new widget's `skeleton/`, `skin/`, `locale.json`). Register
  a new widget Kind in `src/drumee/seeds.js` (`build-and-seeds.md`). Don't add stray markup files.
- After SVG changes run `npm run build:icons`; verify the design in the running app
  (`npm run dev`, stage `https://drumee.in/-/aaron/app`) — no test runner is wired up.
