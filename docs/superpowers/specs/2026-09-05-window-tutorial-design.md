# window_tutorial — an in-window host for the contextual tours

Date: 2026-09-05
Status: approved, ready for an implementation plan

## Problem

The six contextual tours (`workspace`, `chat`, `folder_task`, `share`,
`migrate`, `meeting`) have exactly one host: `desk_tutorial`
(`modules/desk/tutorial/index.js`). It mounts into the desk's `overlay` part
and draws a full-screen MOCK of the product — its own topbar, its own dark
rail, its own breadcrumb — with the step content in the middle.

Some of those tours are about a folder window, and are fired from one: `share`
is raised by the folder window's Manage-access path
(`builtins/window/folder/index.js:1930`). Today that click blanks the entire
desk and replaces it with a drawing of the desk, when the thing being explained
is already on screen.

We want a second host that runs the same tours as an overlay on the folder
window itself.

## Non-goals

- Changing `desk_tutorial`. It keeps every tour it runs today, unchanged.
- Forking the step widgets. All six are reused verbatim.
- Running the `full` tour in a window. It is 23 screens of desk chrome.
- Re-pointing `migrate`. It is fired by the desk's rail-Files button now; the
  folder window only warms its chunk.

## Decisions taken

1. **Second host, shared step widgets.** `window_tutorial` is a parallel host
   implementing the contract the step widgets already expect. `desk_tutorial`
   is untouched.
2. **The folder window raises it directly.** Not a second listener on the
   `tutorial:trigger` broadcast.
3. **It wears both class sets.** Its nodes carry `window-tutorial__*` AND
   `tutorial-main` / `tutorial-main__layout` / `tutorial-main__content`, so the
   existing tutorial skins apply with no edits.
4. **Reachability: registry-driven + a preview URL.** `share` is the one live
   trigger; a `?window_tutorial=<id>` URL reaches all six.
5. **Exit is dismiss-only.** No `tutorial_done` write, no `loadWorkspace`, no
   migrate chain.
6. **The overlay covers the whole folder window**, not just `__main`.

## Architecture

```
src/drumee/builtins/window/tutorial/
  index.js            class __window_tutorial extends LetcBox  → kind window_tutorial
  skeleton/index.js   overlay shell: content slot + tutorial_spotlight
  skin/index.scss     overlay geometry and z-index base only
```

`fig` is derived from the class name (ui-core `letc/addons/letc.js:148-158`),
so `__window_tutorial` → family `window-tutorial`, group `window`. Registered
in `seeds.js` as its own lazy chunk, beside the existing `tutorial_*` entries.

It owns no step content. It reads the same registry
(`modules/desk/tutorial/tours.js`) and mounts the same six step widget kinds.

Dropped relative to `tutorial_main`: the mock topbar, the mock rail,
`_applyChrome`, `_openCreated`, `_workspaceOnScreen`, `_chainMigrateTour`,
`_enterWorkspace`.

Kept: the registry read, `_buildWidgets`, step advance, spotlight routing,
Escape, the size tiers.

### Mounting

`grid(ui)` in `builtins/window/folder/skeleton/index.js` returns a single node
(`window-folder__main`) which becomes the window's `content` part, so a sibling
of `__main` cannot be declared there. Use the idiom this window already has for
a window-level overlay (`_openChatExportModal`, `folder/index.js:2395`):

```js
// __window_folder
showTutorial(tour, opt = {}) {
  if (this._tutorialOverlay) return false;           // one tour per window
  if (!opt.preview && !Tours.claim(tour, this)) return false;
  this.append(Skeletons.Wrapper.Y({
    className: "window-folder__wrapper-tutorial",
    name: "tutorial",
  }));
  return this.ensurePart("wrapper-tutorial").then((w) => {
    this._tutorialOverlay = w;
    w.feed({ kind: "window_tutorial", tour, sys_pn: "window-tutorial",
             partHandler: this, ...opt });
    return true;
  });
}
```

`.window__ui` is `position: absolute; overflow: visible`
(`builtins/window/skin/window.scss:11`), so the wrapper at
`position: absolute; inset: 0` covers the window's header, tab bar and pane
together and stops at the window's edge. In the headless shape that is the
whole workspace pane; the desk rail and topbar stay outside it, which is
`desk_tutorial`'s territory.

The wrapper carries a `z-index`, which opens a stacking context. That is
correct here and strictly better than the desk case: the lit element is always
a mock INSIDE the overlay, so scrim (10003) / lit (10004) / callout (10010) are
in one context by construction and the ancestor-walk problem `_light` exists to
solve cannot leak past the overlay root.

It follows chat-export's `!important` overrides on `position`, `display` and
sizing, for the same reason
(`builtins/widget/chat-export/skin/index.scss:28`). Teardown mirrors
`_closeChatExportOverlay`: `goodbye()` the wrapper, null the handle.

### The host contract

The step widgets are the fixed point. Three obligations.

**a) A content slot, wearing both class sets.**

```js
Skeletons.Box.Y({ active: 0,
  className: `${fig}__layout tutorial-main__layout`,
  kids: [
    Skeletons.Box.Y({ active: 0,
      className: `${fig}__content tutorial-main__content`,
      sys_pn: _a.content,
    }),
    { kind: 'tutorial_spotlight', sys_pn: 'spotlight', partHandler: ui },
  ],
})
```

The root carries `window-tutorial` and `tutorial-main`, plus `data-size`,
`data-short` and `data-tour`. That is what keeps these working unchanged:

- `modules/desk/tutorial/skin/index.scss` — tier rules and the `--pane-fit`
  block (620-676)
- `modules/desk/tutorial/skin/tooltip.scss:415` — callout at narrow/mobile/short
- `modules/desk/tutorial/skin/empty-state.scss:362`
- `modules/desk/tutorial/skin/files.scss`
- `modules/desk/tutorial/chat/skin/index.scss:619`
- `spotlight/index.js:77` — `LAYOUT_CLASS = 'tutorial-main__layout'`, the hard
  stop for the z-index ancestor walk

Our own `window-tutorial__*` classes carry only overlay geometry and the
z-index base.

`tutorial_spotlight` is reused verbatim. It is already
`position: absolute; inset: 0`, and `_keepInView` bounds the callout against
its own rect, so inside the overlay the card is kept inside the folder window
rather than the viewport. No change to that widget.

**b) The same feed payload.** `_buildWidgets` (`tutorial/index.js:150`) with
one change: `_canCreate()` returns `false` always, so the `workspace` tour's
two `live_screens` are dropped and every screen is a mock. Everything else is
identical — `screen_count`, `screen_offset`, `tour_screens`, `is_first`,
`is_last`, `subject`, `subject_data`, no `service`, `uiHandler: [this]` —
because the steps read all of it.

**c) The same `onUiEvent` vocabulary:** `next-step`, `back-step`, `end-tour`,
`spotlight:focus`, `spotlight:clear`. `workspace-created` is accepted and
ignored (nothing can create one here). `_showStep` keeps the clear-then-feed
ordering, which is load-bearing (see the comment at `tutorial/index.js:424`).

### Sizing: measure the window, not the viewport

This is the one place the host must NOT copy `tutorial_main`.

`_applySize` (`tutorial/index.js:338`) reads `window.innerWidth/innerHeight`.
Here that is the wrong box: a popup folder window is ~1000px wide on a 1920px
screen, so the viewport says `wide`, `--pane-fit` stays 1, and a 985px board
mock blows out of the pane.

- `_applySize()` measures `this.el.getBoundingClientRect()`.
- Same four tiers, same `SHORT_HEIGHT`, imported from a shared module rather
  than re-typed.
- Watched with a **ResizeObserver on the overlay root**, not `window.resize`.
  A folder window is dragged, zoomed, tiled, snapped and un-zoomed with no
  viewport event at all: `toggleZoom`, `tileToSide`, `_applyBounds` and the
  `desk:chrome` re-fit all change the box silently.
- Debounced at the existing `REFLOW_MS` (160), then `_applySize()` +
  `spotlight.reflow()` — the same pair the desk host runs, for the same reason
  (the callout's placement was measured against a now-stale rect).
- Fallback to `window.resize` + `orientationchange` when `ResizeObserver` is
  undefined.

Consequence, stated up front: the `narrow` and `mobile` tiers become reachable
on a desktop. `.window__ui` has `min-width: 600px`, so a small folder window
legitimately lands in `mobile`. That path already exists and is designed; it
simply gets exercised far more often than today.

### Lifecycle

| Moment | What happens |
|---|---|
| mount (`onDomRefresh`) | `Tours.armed()` → `Tours.markSeen(tour.flag, this)` unless `preview` → bind Escape (capture phase, `libs/hotkeys`, same `!e.defaultPrevented` interlock) → `_applySize` → observe resize → feed skeleton → feed step 0 → `_preloadSteps` |
| forward past the last step | `softDestroy()` |
| `end-tour` / Escape | `softDestroy()` |
| destroy | `__window_folder`'s `once(_e.destroy)` → `Tours.release(tour)`, clear `_tutorialOverlay` |

No `tutorial_done` write, no `loadWorkspace`, no migrate chain.

The Escape handler drops `tutorial_main`'s `_liveStepRunning()` guard: with
`_canCreate()` false no live screen ever runs here, so there is no half-typed
form to protect.

Seen-set and single-flight are the SHARED ones in `libs/tutorial-tours`, so a
tour seen in-window is suppressed on the desk and vice versa. That is the point
of the flag being per-account.

### What raises it

**`share`** — `folder/index.js:1930` is the only tour this window fires. It
calls `Tours.fire(...)`, which broadcasts and lets the desk mount it. To mount
locally instead, one addition to `libs/tutorial-tours`:

```js
/** fire() minus the broadcast: run every gate, take single-flight, and let the
 *  CALLER mount the tour itself. For a host that is not the desk. */
function claim(tourId, host) { /* enabled / isMobile / TOUR_IDS / isSeen / _inFlight */ }
function fire(tourId, host, opt) { return claim(tourId, host) && broadcast(...); }
```

One gate implementation, two ways to consume it. The share call site becomes:

```js
if (Tours.claim("share", this)) {
  this.showTutorial("share", { subject: "workspace", subject_data: {...} });
}
```

`claim` releases through the same `release()`, so `Tours.whenDone` at
`folder/index.js:1771` keeps working unchanged.

**The claim must not be able to strand single-flight.** `showTutorial` bails
when a tour is already mounted in this window, and the caller has by then
already taken `_inFlight`. If nothing mounts, nothing ever destroys, and
`release()` is never reached — every tour is dead for the rest of the session
(the 30s guard timer only covers the window between `claim` and `armed`, and it
does cover this, but 30 seconds of silently swallowed triggers is still a bug).

So the ORDER is: `showTutorial` owns the guard AND the claim.

```js
showTutorial(tour, opt = {}) {
  if (this._tutorialOverlay) return false;
  if (!opt.preview && !Tours.claim(tour, this)) return false;
  // ... append wrapper, feed
  return true;
}
```

The call site becomes `this.showTutorial("share", {...})` with no claim of its
own. A preview URL skips the claim entirely, matching the desk's rule that an
explicitly requested tour is never gated.

**Preview** — `#/desk?window_tutorial=<id>&step=<n>&screen=<n>`, read in
`buildContent` via `Visitor.parseModuleArgs()`, consumed once via a
module-level latch so several open folder windows do not each raise it.
Carries `preview: 1`, so it is exempt from the seen-set on the way in AND out,
exactly like the desk's `?tutorial=`. This is what makes all six tours
reachable for review.

`step` and `screen` are 1-based and clamped, matching the desk's `_forcedTourOpt`.

## Shared code

`SIZE_TIERS`, `SHORT_HEIGHT`, `REFLOW_MS` and `_buildWidgets` are the only real
overlap with `tutorial_main`. Extract them to
`modules/desk/tutorial/host-kit.js` and have both hosts require it.

This is a NARROW extraction — two pure functions and a table move out of
`tutorial/index.js`; nothing about that widget is restructured. It stays
consistent with "second host, `desk_tutorial` untouched".

## Files touched

| File | Change |
|---|---|
| `builtins/window/tutorial/index.js` | new — the host |
| `builtins/window/tutorial/skeleton/index.js` | new — overlay shell |
| `builtins/window/tutorial/skin/index.scss` | new — overlay geometry |
| `seeds.js` | register `window_tutorial` |
| `builtins/window/folder/index.js` | `showTutorial`, `onPartReady` case, teardown, preview read, share call site |
| `builtins/window/folder/skin/index.scss` | `__wrapper-tutorial` geometry |
| `libs/tutorial-tours.js` | `claim()`, `fire()` re-expressed over it |
| `modules/desk/tutorial/host-kit.js` | new — shared tiers + `_buildWidgets` |
| `modules/desk/tutorial/index.js` | require `host-kit` instead of local copies |

## Verification

No test runner is wired in this repo; `tests/helpers/` is the harness
(`render-skeleton.js` renders the REAL skeleton into an assertable tree).

1. `render-skeleton` assertions on the new skeleton: both class sets present on
   layout and content, `tutorial_spotlight` declared, and the step payload for
   a given tour matches what `tutorial_main` produces for the same tour.
2. Unit assertions on `claim()`: each gate in turn (kill switch, mobile,
   unknown id, seen, in-flight), and that `fire()` still broadcasts.
3. Standalone `sass -I . -I skin` compile of the new skin plus the tutorial
   skins, then a chromium `--dump-dom` harness rendering the real skeleton at
   overlay box widths 1440 / 1200 / 900 / 700 to confirm the tier stamps and
   `--pane-fit` land. Measuring the OVERLAY box is the whole point of the
   sizing section.
4. Manual: `?window_tutorial=<id>` for all six, in both a popup folder window
   and a headless workspace pane, resized / zoomed / tiled mid-tour.

## Known oddities, accepted

- The `workspace` tour's content mocks the desk home canvas and the
  create-workspace dialog. Rendered over a folder window it renders correctly
  but teaches a screen that is not there. Acceptable because its only in-window
  entry point is the preview URL.
- `full` is excluded from this host.
