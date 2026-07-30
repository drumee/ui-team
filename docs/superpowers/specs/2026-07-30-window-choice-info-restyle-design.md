# Restyle `window/choice` on `window/info`

Date: 2026-07-30

## Goal

Give `builtins/window/choice` the base style and UI of `builtins/window/info`, so
the two modal dialogs read as one system instead of two generations of design.

## Current state

`window/choice` is a `Wm.choice(message, ...questions)` modal that resolves
`{choice, content}` where `choice` is the 1-based index of the clicked button
(`0` when dismissed via the X). It has exactly three call sites:

| Call site | Buttons |
|---|---|
| `modules/desk/wm/push.js:141` — removed from organization | 1 (`GOT_IT`) |
| `modules/desk/wm/push.js:224` — workspace access revoked | 1 (`GOT_IT`) |
| `builtins/media/core.js:2130` — upload name conflict | 3 (`CANCEL` / `REPLACE`\|`INSERT` / `DUPLICATE`) |

Its look: a 490×300-minimum card, a centered 16/26 weight-300 message with
`padding: 31px 10px 5px`, and a 110px-tall centered row of 115px pill buttons
(`first` = outline, `normal` = filled `--primary-500`).

Two latent defects live in the same files:

- `skeleton/header.js` builds its prefix as `` `${ui.fig.group}-confirm` ``, so it
  emits `window-confirm-topbar__container` / `window-confirm__title`. The
  `&-topbar` and `&__title` rules in `skin/index.scss` are therefore dead, and
  the header is actually styled by `window/confirm`'s skin.
- `ui.megt(...)` (typo for `mget`) in `skeleton/footer.js` and
  `skeleton/index.js`, reachable only when a caller omits the message.

## What `window/info` provides

- `__ui`: 500px wide, `max-width: 100%`, `height: auto` so the card hugs its
  content; mobile clamp `calc(100vw - 32px)` capped at 340px.
- `__topbar`: drumee logo (`logo-upload` svg + "drumee" text) left, X close
  right, `space-between`.
- Message: left-aligned 14/20 weight-400 `var(--normal-fg)`.
- `__buttons`: right-aligned, `gap: 8px`, built with the shared `button()`
  toolkit plus `@include common-button`; `secondary` = transparent + 1px border,
  `primary` = filled `--primary-50`; 36px tall, min-width 88px.
- An explicit `html[data-theme="dark"]` override block.

## Design

### Card and layout

`window-choice__ui` drops `min-height: 300px`, `min-width: 490px` and the
`data-maxsize` rules, and takes info's card: 500px wide, `max-width: 100%`,
`height: auto`, plus info's mobile clamp.

Card chrome comes from info's `[data-variant="notice"]` form — `--normal-bg-90`
surface, `--corner-radius-4` radius, 1px `--border-default`,
`0 14px 42px rgba(11, 10, 33, 0.16)` shadow, `padding: 20px 24px 24px` — because
choice is always a standalone modal card and that is info's polished form.

The notice variant's `position: fixed` centering block is deliberately **not**
adopted: choice is fed into `Wm.__wrapperModal`, which already positions it.

`__main` becomes `padding: 0; gap: 16px; min-height: 0`.

### Header

`skeleton/header.js` is replaced by `skeleton/topbar.js`, a copy of info's:
drumee logo left, X close right, close on `service: _e.close`.

`_e.close` and `_a.close` both resolve to the string `"close"`, so the existing
`this.once(_a.close, …)` listener in `ask()` keeps resolving `{choice: 0}`
unchanged.

This removes the `-confirm` prefix defect, so the dead `&-topbar` and `&__title`
rules are deleted along with the unused `_a.title` header.

### Message

`skeleton/body.js` mirrors info's `message.js`: a `__container` Box.Y wrapping
the message as `__message inner`, keeping `sys_pn: "content"` so the existing
`onPartReady` wiring is untouched. Text moves from centered 16/26 weight-300 to
info's left-aligned 14/20 weight-400 `var(--normal-fg)`.

The `.delete-team` and `.trash` modifiers are dropped: `delete-team` existed only
to cap width at 450px, which the fixed 500px card makes redundant, and `.trash`
has no producer anywhere in the tree.

### Buttons

`skeleton/footer.js` switches from hand-rolled Notes to the shared `button()`
toolkit, yielding `.window-choice__button-main.{secondary|primary}` and
`.window-choice__button.btn`. The row becomes right-aligned with `gap: 8px`;
buttons become 36px tall / min-width 88px with info's secondary-outline and
primary-filled treatments.

Priority mapping preserves today's semantics exactly: **button 1 = secondary,
buttons 2+ = primary**. A single-button dialog (`Got it`) is therefore an outline
button, matching info's own default Close, which is also secondary.

`button()` does not forward an arbitrary `choice` field, so the footer passes
`value: i` and `ask()` reads `value` (falling back to `choice`), deriving
`content` from the `questions` array it already closes over. The resolved
`{choice, content}` shape stays byte-identical for `media/core.js`, which
switches on `r.choice === 1 | 2 | 3`.

### Incidentals folded in

- `ui.megt(...)` → `ui.mget(...)` in `footer.js` and `skeleton/index.js`.
- Default mode `"hbfc"` → `"hbf"` (info's). The `c` flag only selected the old
  minimize/zoom control, which the new topbar replaces.
- A `html[data-theme="dark"] .window-choice` block mirroring info's, so message
  text tracks `--normal-fg-10` in dark mode.
- `index.js` keeps `maxsize` and `data-type="confirm"`; both are harmless once
  the skin stops keying off them.

## Blast radius

Three call sites, all listed above. Nothing outside `builtins/window/choice/`
changes.

## Verification

- Standalone `sass -I . -I skin` compile of the rewritten skin.
- A chromium-headless harness rendering the three real call shapes — 1-button
  (`Got it`), 1-button (kicked out), 3-button (Cancel / Replace / Duplicate) — in
  light and dark themes. `hub.member_removed` cannot be click-tested on this box.
