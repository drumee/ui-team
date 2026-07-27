# Reward flow — "Don't drop now" guard on Step 2's invite popup

**Date:** 2026-07-27
**Status:** approved
**Area:** `src/drumee/builtins/widget/reward-flow`

## Problem

Every other surface of the reward flow guards abandonment. An active step card
dims the desk behind a clickable vignette, and clicking it raises "Don't drop
now" (`reward-vignette-click` → `dropModal`). The Step 1 walkthrough does the
same through `__guide-scrim`, the clickable frame around its spotlight hole.

`step2_waiting` — the sub-step where the real invite popup
(`.invite-popup__container`) is on screen — has no guard at all. The flow's
vignette goes transparent and click-through so the user can operate the popup,
and the wrapper-modal hosting it carries no click service, so clicking the
dimmed area around the popup does nothing whatsoever. The user is one stray
click away from expecting a dismissal and getting silence, on the one step where
the flow has handed control to somebody else's widget.

## Behaviour

While the invite popup is displayed, a click on the dimmed backdrop around it
raises "Don't drop now".

- **Continue** closes the guard. The popup is still mounted underneath with the
  emails the user typed, and the step is still `step2_waiting`.
- **Drop anyway** ends the flow, as everywhere else: `dropped` is written to the
  funnel and the widget tears down. The invite popup goes with it.

The popup's own ✕ is untouched: it still closes the popup and re-arms the Step 2
card, no guard. Only the backdrop gesture is new.

The guard covers the popup and nothing else that passes through the same host.
After a successful send the popup is replaced by the invite-sent toast while the
step is *still* `step2_waiting` (`_awaitToastDismissed` holds there until the
user dismisses it) — the user has already done what Step 2 asked, so closing
that confirmation is not abandonment. The listener therefore fires only while
`.invite-popup__container` is actually in the host, and `onInvitationSent`
unhooks it outright to cover the window between the send landing and the popup
going.

## Design

### Trigger — a listener on the host, not a rendered scrim

`_watchInviteBackdrop()` installs a **capture-phase** `click` listener on
`Wm.__wrapperModal.el` when the flow enters `step2_waiting`, right where
`_markInviteOverlay(true)` already fires in `_goto`. It is removed on leaving
that step and in `_unbind`.

The handler ignores a click that lands inside `.invite-popup__container` (the
popup is the whole point) or while the guard is already up; anything else on
that host is the backdrop, so it stops propagation and opens the guard.

The alternative — rendering a scrim in the flow's own root, the way
`__guide-scrim` works — would need the root lifted above the wrapper-modal's
z 100000 *and* a `clip-path` hole kept in sync with the popup's rect across
resizes. Testing `closest()` on the host is exact by construction and measures
nothing.

Capture phase so the guard lands before any handler a wrapper-modal child
installs.

### Host — the flow's own in-root modal, renamed

The guard cannot use `_openModal`: that feeds `Wm.__wrapperModal`, which would
replace the invite popup and destroy the user's draft — the exact thing the
Continue path exists to preserve.

It reuses the in-root modal host built for the Step 1 walkthrough for the same
reason. Because it now serves two states, the "guide" name would lie:

| before | after |
|---|---|
| `__guide-modal` (class) | `__drop-modal` |
| `guide-modal` (part) | `drop-modal` |
| `_openGuideDrop` / `_closeGuideDrop` | `_openDropGuard` / `_closeDropGuard` |
| `_guideDropOpen` | `_dropGuardOpen` |

The host is rendered in `cardKids` as well as `guideKids`. It is inert
(`pointer-events: none`) until the orchestrator sets `data-open="1"`.

### Stacking

The flow root sits at z 10020, below the wrapper-modal, so the guard would paint
*under* the invite popup. One rule, mirroring the existing guiding lift:

```scss
&__root[data-drop="1"] { z-index: 1000000; }
```

`data-drop` is written imperatively on the root while the guard is up, so
raising it never triggers a re-render.

### Teardown

`_finish()` must now also clear the invite popup, or "Drop anyway" leaves it
orphaned on screen after the flow is gone. Clearing it fires the desk's destroy
hook → `onInvitePopupClosed()`, which would try to `_goto("step2")` mid-teardown.
`_finish` therefore sets a `_finishing` latch that `onInvitePopupClosed` returns
on.

## Testing

No test runner in this repo. Verification is the manual path, as with the Step 3
walkthrough:

1. `#/desk?reward=1` → Step 1 → reach Step 2 and press **Invite member**.
2. With the popup open, type an email, then click the dim outside it → the guard
   appears above the popup.
3. **Continue** → guard gone, popup still there, email still typed.
4. Re-raise it and press **Drop anyway** → popup and flow both gone, desk usable.
5. The popup's ✕ still returns to the Step 2 card with no guard.
6. Send a real invitation → the success toast appears; its Close/✕ dismisses it
   and moves to Step 3 with no guard in between.
7. Step 1's walkthrough guard still behaves (the rename touches it).
