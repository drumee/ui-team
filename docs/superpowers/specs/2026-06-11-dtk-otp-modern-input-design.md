# dtk_otp — Modern OTP Input Behavior

**Date:** 2026-06-11
**Component:** `@drumee/ui-toolkit/widgets/otp` (`dtk_otp`)
**Delivery:** Patched in `ui-team` via `patch-package` (package is published, v0.0.20; no local source checkout).

## Goal

Bring the `dtk_otp` widget up to modern authentication-flow UX: one char per box,
auto-advance, full keyboard navigation, robust paste, and overwrite-on-type.

## Constraints

- Changes stay **inside the `dtk_otp` widget**. The shared core `Entry`
  (`@drumee/ui-core/letc/widgets/entry/input`) is used by every input in the app
  and must not be modified.
- OTP-specific key handling is bound directly to each box's DOM `<input>`, the same
  pattern the widget already uses for paste (`bindPasteEvent`).
- Existing integration is preserved: `api`/`successService` verify wiring,
  `resend-code`, `displayMessage` (3s transient), model `flow`, CSS classes, markup.

## Configuration (read in `initialize`)

| Option    | Default     | Meaning |
|-----------|-------------|---------|
| `length`  | `6`         | Number of boxes; drives skeleton loop, paste, and auto-submit. |
| `charset` | `'numeric'` | `'numeric'` → `/^[0-9]$/`; `'alphanumeric'` → `/^[0-9a-zA-Z]$/`. |

Case is **preserved as typed** (no upper/lower normalization).
A single `_validChar(ch)` helper is the one source of truth, reused by keydown and paste.

## Skeleton changes

- Loop `length` times instead of literal `6`.
- `maxlength: 1` per box (fixes the current `maxlength: 6` bug allowing multiple chars).
- Drop `min/max` from box `kidsOpt` (range only matters for numeric pacing; validation
  is now handled by `_validChar`).

## Keydown behavior (`bindKeyEvents`, bound per `_input`)

- **Printable key:** if `_validChar` → set this box to the char, advance focus to next
  box, `preventDefault` (no native insert → no double-entry). Overwrites any existing
  value. Invalid char → `preventDefault`, ignored.
- **Backspace:** box has value → clear it (stay). Box empty → move to previous box and
  clear it.
- **Delete:** clear current box.
- **ArrowLeft / ArrowRight:** move focus between boxes, `preventDefault`.
- **Tab / Shift+Tab:** no `preventDefault` — normal browser navigation.
- **Ctrl/Meta/Alt + key:** ignored (lets copy/paste/select-all shortcuts through).
- After a box is filled, run `checkForm` (existing auto-submit on full code).

Overwrite-on-type and select-then-type both fall out of "always `setValue` the current
box + `preventDefault`". Focus moves also `select()` the target box so the digit is
highlighted for easy overwrite.

## Paste behavior (rewrite `bindPasteEvent`)

- `preventDefault`; read text from `clipboardData` directly (drop the fixed 300ms timeout).
- Filter to `_validChar` only (fixes the current unanchored `[0-9]{1,6}` regex that let
  stray non-digits through), distribute starting at the **focused box's index**.
- Stop when boxes run out (ignore overflow beyond `length`).
- Focus the **last populated** box, then `checkForm`.

## checkForm (generalized)

Collect each box's value; require all `length` boxes filled with valid chars before
POSTing `{ ...payload, code }` to `api`. (Previously hardcoded `>= 6` and filtered with
`/[0-9]/`, which would drop letters in alphanumeric mode.)

## onUiEvent (simplified)

`_a.input` case now just calls `checkForm` (navigation is owned by the keydown handler).
`resend-code` and `default` unchanged.

## Bugfix: click anywhere auto-submits

The framework binds `el.onclick = __handleClick` on the widget root
(`letc.js`), and `__handleClick` calls `triggerHandlers(MouseEvent)`, which
dispatches the widget's `service` (the host's `successService`) on **any**
click in the card's empty space — prematurely submitting/closing the modal.
The old mitigation was a fragile per-consumer guard ("require `args.data`").

There are two click paths, and both are closed:

1. **Click on the widget root element.** `onlyKeyboard: 1` on the `dtk_otp` model
   in `initialize` — the framework's own flag (`letc.js`) that skips binding the
   root's mouse handlers.

2. **Click on a descendant (the real bug: `dtk-otp__main`, header, message,
   gaps between digits).** `getHandlers` walks *up* the parent chain, so a click
   on any serviceless descendant is routed to `dtk_otp.onUiEvent` with
   `service === undefined`, landing in the `default` branch. Re-dispatching that
   event made the host read `dtk_otp`'s own `service` — i.e. `successService` —
   and submit. Fix: the `default` branch now forwards **only** when `service` is
   truthy; serviceless stray clicks are swallowed.

Keyboard handling, child views (digits/resend/close), and the programmatic
`checkForm()` → `triggerHandlers({ data, service })` success dispatch are all
unaffected. Submission happens **only** when every box is filled (`checkForm`).

## Invalid-code handling (no page refresh, error shown in place)

Server action endpoints report a bad code *inside* `data` in varying shapes:
`set_mfa` → `{ error: "INVALID_CODE" }`; `otp.verify` → `{ error: 1, status:
"wrong-code" }`. The old `checkForm` checked only `data.error`; a `status`-only
or differently-shaped error could slip through, be treated as success, and fire
the host's success service → navigation ("page refresh").

Fix in `checkForm`:
- `_isErrorResponse(data)` catches every failure shape: truthy `error`, a known
  error `status` (`wrong-code`/`no-user`/`no-socket`/`expired`/`invalid`/
  `INVALID_CODE`), a non-200 throw, or a null/empty body.
- On failure → `_onInvalidCode`: show the message in the `tips` row **below**
  the inputs (red, `data-error="1"`, persistent), clear the boxes, focus the
  first. It does **not** trigger the success service and does **not** rethrow,
  so the host never navigates and nothing bubbles to a global reload.
- `displayMessage(msg, error, persist)` gained a `persist` flag (errors stay
  until retry); `clearMessage()` wipes it when the user types again
  (`_onDigitKeydown`).
- Success path unchanged: a non-error response still triggers the host service.

## Reconnect popup uses dtk_otp (reconnect only)

The `router-butler__reconnect` popup embeds `welcome_signin`, whose OTP step
(`prompt_otp`) rendered a single-input screen (`skeleton/otp.js`). For reconnect
**only**, it now uses the dtk_otp 6-box widget so it matches `dtk-otp__main`.

- `prompt_otp(data)` branches on `this.mget('reconnect')` → `_promptOtpReconnect`,
  which self-registers `dtk_otp` (Kind.waitFor) and feeds a new
  `skeleton/otp-reconnect.js`. Normal sign-in keeps `skeleton/otp.js` unchanged.
- Widget config: `api: SERVICE.yp.authenticate`, `payload: { secret }`,
  `length: 6`, `charset: 'numeric'`, `service: 'reconnect-otp-verified'`,
  `resendService: 'resend-otp'`, `uiHandler: [module]`.
- Auto-submit POSTs `yp.authenticate { secret, code }`. A clean response fires
  `reconnect-otp-verified` → `checkLoginStatus(args.data)` (reuses all existing
  ok/cross-signin/etc. logic). A bad code (`INVALID_CODE`/`INVALID_SECRET`) is
  caught inline by the widget and shown below the boxes — no navigation.
- Resend: dtk_otp's built-in resend link delegates to the host's existing
  `resend-otp` (re-runs `yp.login`) via the new `resendService` option.

Two generic, backward-compatible widget additions support this (patched in all
three projects): `_isErrorResponse` now also treats `INVALID_SECRET` as a bad
code; the `resend-code` handler delegates to `resendService` when set instead of
POSTing `otp.send`.

### Behavior note
dtk_otp posts `yp.authenticate` directly (mirroring `authenticateUser()`),
which skips the `yp.hello` cross-session pre-check the manual "Go" button ran.
In practice reconnect takes the `authenticateUser()` branch anyway; flag if the
cross-session prompt is required in the reconnect popup.

## Out of scope

- Single-hidden-input architectures; we keep N `Entry` widgets.
- Theming/visual changes.
- RTL-specific arrow remapping.
