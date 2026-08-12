# Get help — "Product Tour" primary button

**Date:** 2026-08-12
**Scope:** `help_main` (Get help desk screen) → `desk_tutorial` (6-step product tour)

## Goal

Give the Get help screen an explicit entry point into the interactive product
tour. Today the tour only runs automatically — on first sign-in after signup
(`Visitor.parseModuleArgs().tutorial` or `_postOnboardingTutorial`), or when
forced with a URL argument. A user who skipped it, or who wants to see it
again, has no way to start it from the UI.

A primary button sits under the Product tour video and starts the tour.

## Placement

Right-aligned, directly below `help-main__video-frame`, above the article card
grid:

```
Product tour
┌──────────────────────┐
│   [video-frame]      │
└──────────────────────┘
        [ Product Tour ]   ← right side
┌────────┐ ┌────────┐
│ article│ │ article│
└────────┘ └────────┘
```

**Product tour page only.** `articlePage` in `skeleton/content.js` renders both
the Product tour and the Self-hosting pages; the button is gated on
`ui.getPage() === "product-tour"`. A "Product Tour" CTA under a self-hosting
video would read as a mismatch.

## Components

### 1. `skeleton/common.js` — `tourButton(ui)`

Exported alongside the other shared page pieces. Label-only, so it is a single
`Skeletons.Note` carrying the `service` — the same primitive the existing
`feedback-support-link` uses. With no nested kids there is no need for the
`kidsOpt: { active: 0 }` inerting that the video poster and article cards
require.

```js
function tourButton(ui) {
  const pfx = `${ui.fig.family}__tour`;
  return Skeletons.Box.X({
    className: `${pfx}-row`,          // justify-content: flex-end
    kids: [
      Skeletons.Note({
        className: `${pfx}-btn`,
        content: LOCALE.HELP_START_PRODUCT_TOUR,
        service: "help-product-tour",
        uiHandler: [ui],
      }),
    ],
  });
}
```

The row wrapper exists so the button hugs the right edge of the 900px content
column without the button itself having to be `align-self`-positioned — and so
the mobile breakpoint has one element to restyle.

### 2. `skeleton/content.js` — insertion

```js
kids: [
  pageHead,
  videoBlock(ui, ui.getVideo()),
  ui.getPage() === "product-tour" ? tourButton(ui) : null,
  articleGrid(ui, data.articles),
].filter(Boolean),
```

The existing `.filter(Boolean)` absorbs the `null` on other pages.

### 3. `skin/index.scss` — `&__tour`

A new block after the video block:

- `-row`: `justify-content: flex-end`, full width.
- `-btn`: filled pill on the file's existing `$purple-base` (#5950ff), white
  600-weight label, `--spacer-*` padding, `@include focus-ring`, hover
  darkening to `$purple-deep` (#433cc5), `cursor: pointer`, and the file's
  shared `$fast`/`$ease` transition so it feels like the rest of the screen.

Colours come from the variables already declared at the top of the file — no
new tokens, no hex literals introduced.

At `max-width: 768px` the button goes full width (row switches to
`stretch`), matching how `__article-card` and `__feedback-row` already reflow
at that breakpoint. Under `prefers-reduced-motion` the button joins the
existing list of elements whose transitions are killed while colour changes
are kept.

### 4. Click path — help → desk → tutorial

`help_main` is mounted into the desk's `settings-main-slot` by
`desk_module._loadKind()`, which feeds `uiHandler: [this]`. The desk is
therefore already the widget's ui handler, and `triggerHandlers` is the
established way up — `settings_main` uses exactly this route for
`upgrade-plan`.

**`help_main.onUiEvent`:**

```js
case "help-product-tour":
  this.triggerHandlers({ service: "start-product-tour" });
  break;
```

**`desk_module.onUiEvent`:**

```js
case "start-product-tour":
  return this._startProductTour();
```

**`desk_module._startProductTour()`** closes the Get help screen, then reuses
the desk's existing launcher:

```js
_startProductTour() {
  // ...guard: a live desk_tutorial in the overlay means don't re-feed...
  this._tourReturnsToHelp = true;
  // togglePanel with no openOnly closes the panel: settings-main-slot is not
  // a keep-alive slot, so the child animates out (data-anim="out") and is
  // destroyed 250ms later.
  this.togglePanel("help_main", "settings-main-slot");
  this._showTutorial();
}
```

The help screen must close: the tutorial paints its own mock workspace, so a
still-mounted Get help screen behind it would show through as a broken
half-state.

A guard prevents re-feeding over a tour that is already running (the overlay
part already holding a live `desk_tutorial` child).

Reusing `_showTutorial()` rather than feeding `desk_tutorial` directly keeps
one launch path for the tour.

## Return trip — finishing the tour goes back to Get help

Because the screen is closed on the way in, finishing the tour has to put it
back: the user asked for a tour *from* Get help, so that is where they are
returned. An automatic post-signup run is unaffected and still leaves the user
on the desk.

`_tourReturnsToHelp` carries the intent from `_startProductTour()` across to
`onPartReady("desk-tutorial")` — the only reliable handle on the mounted
tutorial, for the same reason `_showTutorial()` documents (a `feed()` return
value races). There, `_chainHelpReturnAfterTutorial(child)` **consumes** the
flag and, if it was set, hooks the tutorial's completion:

```js
_chainHelpReturnAfterTutorial(tutorial) {
  const returns = this._tourReturnsToHelp;
  this._tourReturnsToHelp = false;
  if (!returns || !tutorial || !_.isFunction(tutorial.once)) return;
  tutorial.once(_e.destroy, () => this._openGetHelp());
}
```

Consuming the flag at mount rather than in the destroy handler means a later
automatic run can never inherit a stale intent.

`_e.destroy` is the completion signal: the tutorial ends by calling
`softDestroy()` from `_enterWorkspace()`, which routes through `selfDestroy()`
→ `destroy()`. This is the same signal `_chainRewardFlowAfterTutorial` already
relies on.

### `_openGetHelp()` — shared open path

Opening Get help is factored out of the `toggle-help` case into
`_openGetHelp()`, now called by both the sidebar entry and the return trip, so
both land on the same screen with the same breadcrumb. Because the panel is
destroyed on close, it always re-opens on `help_main`'s default page — Product
tour, which is the page the button was on.

### Accepted rough edge

`softDestroy` fades for 0.5s and destroys only afterwards, so `destroy` arrives
once the tour is already off screen: the desk is visible for the moment it takes
the panel to mount. Left as is — there is no "tour is exiting" signal to open
the panel earlier, and pre-opening Get help at launch is exactly what the
close-on-entry exists to avoid.

## Reward flow — a non-issue for this path

`_showTutorial()` passes `partHandler: this`, so `onPartReady("desk-tutorial")`
also fires `_chainRewardFlowAfterTutorial`, which chains `_afterHomeSettled()`
on tutorial exit.

That is a no-op for a help-initiated tour: `_afterHomeSettled()` returns early
on `_homeSettledDone`, which is set once per session, and the desk has long
since settled by the time anyone opens Get help. No reward or LAUNCH30 popup can
appear on the way back to Get help.

## Locale

New key `HELP_START_PRODUCT_TOUR: "Product Tour"` in `locale/en.json`.

A new key rather than reusing `HELP_NAV_PRODUCT_TOUR` ("Product tour"), so the
nav label and the button label can diverge without one dragging the other.

The English string is mirrored into `es/fr/km/ru/zh.json` so no locale renders
an empty button.

## Testing

No automated tests — this repo has no test runner wired up (see CLAUDE.md).
Verification is by inspection of the rendered screen and by following the click
through to a mounted `desk_tutorial`.
