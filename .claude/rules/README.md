# Project Rules — Drumee ui-team

Path-scoped rule files for Claude Code.

- A rule **with** a `paths:` frontmatter activates only when a read/edited file matches one of its globs.
- A rule **without** `paths:` is always active.

## Division of labor

- `CLAUDE.md` (repo root) = **reference**: how the framework works (full SDK, Skeletons, MFS, runtime globals).
- `.claude/rules/` = **imperative checklists**: what to do / avoid, scoped to the files you touch. Rules link back to CLAUDE.md sections — they don't re-explain them.

## Catalog

| File | Activates on | Purpose |
|------|--------------|---------|
| `framework-invariants.md` | always | non-negotiable contracts: globals not imported, fig naming + seeds authority, no raw HTML, UPPERCASE LOCALE, `fetchService`/`postService`, `onWsMessage` signature |
| `widget-development.md` | `builtins/{widget,panel,editor,messenger,media,permission,webrtc}/**`, `builtins/{window,player}/**/widget/**`, `api/lib/**` | widget lifecycle, base class (+ exceptions), WS bind/unbind cleanup |
| `window-development.md` | `builtins/{window,player,webrtc}/**` | inheritance chain, `Wm.launch`, media-stream cleanup |
| `skeleton-ui.md` | `**/skeleton/**` | Skeletons-only UI, BEM `pfx = fig.family`, event wiring |
| `styling-scss.md` | `**/*.scss` | BEM root = fig.family, design tokens over literals |
| `i18n-locale.md` | `locale/**` | maintaining UPPERCASE keys, mirror across all langs |
| `build-and-seeds.md` | `webpack/**`, `seeds.js` | generated seeds (seeds.js authoritative), class-name preservation (`keep_classnames`), path aliases |
| `api-services.md` | `api/**`, `lex/**` | `SERVICE.*` names, lexicon constants, `onServerComplain` |

## Authoring conventions

- Short, bullet/checklist form — parse-fast.
- Kebab-case, descriptive names.
- Include good vs bad examples where they prevent a real mistake.
- No rules for one-off concerns (YAGNI). No content duplicated from `CLAUDE.md`.
