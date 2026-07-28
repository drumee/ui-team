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

### The invite-sent confirmation

A successful send replaces the popup with the confirmation card
(`window_info`) in the same wrapper-modal, and the step stays `step2_waiting`
until the user closes it — that close is what advances to Step 3.

Step 2 guards that phase exactly as **Step 1's perm phase** does. There, the
same confirmation replaces the permission panel, `__guide-scrim` keeps catching
clicks around it, and closing it calls `_complete()` → Step 2 (see `guide.js`
`_resolveSub` / `_coachFor`). So here too:

- a click **on** the confirmation — including its Close/✕ — is the user
  completing Step 2, never abandonment, and raises nothing;
- a click **beside** it is the same abandon gesture as beside the popup, and
  raises "Don't drop now";
- closing it continues to Step 3, unchanged.

Both surfaces are therefore named together (`STEP2_SURFACES`), and the guard is
armed for as long as either is on screen. When neither is, the host is showing
somebody else's business and there is nothing to abandon.

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

`_finish()` must take down every surface the flow handed the user to, or "Drop
anyway" leaves one orphaned on screen after the flow is gone —
`_closeHandoffSurfaces()`, gated on the step so an exit from congrats cannot
shut something the user opened for themselves:

| step | surface | host |
|---|---|---|
| `step1_guide` | create form, `permission_restricted` | wrapper-modal |
| `step1_guide` | `window_secure_share` (external branch) | window pool |
| `step2_waiting` | invite popup, invite-sent confirmation | wrapper-modal |

An emptied wrapper-modal left at `data-state="open"` is worse than untidy: it is
an invisible full-viewport blocker over the desk. It is closed, not just
cleared.

Two ordering constraints:

- the walkthrough is stopped **before** its surfaces are cleared. Its observer
  would otherwise read the permission panel vanishing as the user having closed
  it and complete Step 1 on a flow that is already leaving.
- clearing the invite popup fires the desk's destroy hook →
  `onInvitePopupClosed()`, which would `_goto("step2")` mid-teardown, so
  `_finish` sets a `_finishing` latch that it returns on.

## Testing

No test runner in this repo. Verification is the manual path, as with the Step 3
walkthrough:

1. `#/desk?reward=1` → Step 1 → reach Step 2 and press **Invite member**.
2. With the popup open, type an email, then click the dim outside it → the guard
   appears above the popup.
3. **Continue** → guard gone, popup still there, email still typed.
4. Re-raise it and press **Drop anyway** → popup and flow both gone, desk usable.
5. The popup's ✕ still returns to the Step 2 card with no guard.
6. Send a real invitation → the confirmation appears. Clicking beside it raises
   the guard; **Continue** hands it back; its own Close/✕ raises nothing and
   moves the flow to Step 3.
7. Step 1's walkthrough guard still behaves (the rename touches it).
