# welcome/signin — full sign-in form parity port

**Date:** 2026-06-28
**Area:** `src/drumee/modules/welcome/signin`
**Reference:** standalone `signin` app `src/widgets/form`, Figma `g5V3PjhNMf5bHlsHMvV17w` node `5:73985`

## Overview

Bring the ui-team `welcome/signin` sign-in card to visual and structural parity
with the standalone `signin` app's `form` widget (and the Figma "Log in"
design), **adapted** to ui-team's backend service surface and **without
regressing** the flows unique to ui-team (single-input OTP, dtk_otp reconnect
popup, company-URL, cross-signin, gateway, org-aware header).

The standalone `signin` app is a newer, standalone deployment whose backend
exposes services this server does not. A literal 1:1 port is therefore
impossible; this spec records what ports cleanly and how the gaps are adapted.

## Goals

- In-card **"Forgot password?"** link that opens an **inline forgot-password
  view**, then a **check-inbox view** with a resend cooldown — replacing the
  current hand-off to the `#/welcome/reset` route for the *request* step.
- **Google + Apple** social buttons rendered to match the Figma (currently
  Google-only).
- Footer **terms block** matching the signin app's structure
  (`see-privacy-terms` / `see-services-terms`).
- Visual fidelity to the Figma for all of the above.

## Non-goals

- Replacing the login backend. ui-team uses `SERVICE.yp.login` (wired into the
  OTP / reconnect / cross-signin / company-URL machinery); the signin app's
  `yp.signin` is **not** adopted. `checkLoginStatus` and all existing flows stay.
- Changing the org-aware header. Per decision, the dynamic
  `Organization.name()` + custom-domain header in `skeleton/auth.js` /
  `skeleton/header.js` is **kept** (not the Figma's static "Welcome to DRUMEE").
- Replacing the `welcome/reset` module. The reset **email link still lands on
  `welcome/reset`** (token check → set new password → success). Only the
  *request-a-link* step moves into the signin card.
- Wiring real Google/Apple OAuth or `Platform.legals` (backend follow-ups).

## Constraints discovered (backend differs from the signin app)

| signin app dependency | ui-team status | adaptation |
|---|---|---|
| `SERVICE.google.initiate` / `SERVICE.apple.initiate` | absent from `lex/services.json`; the current `google-signin` button has **no handler** (dead placeholder) | render Google **and** Apple buttons; `use-google` / `use-apple` handlers are **no-op placeholders** pending backend |
| `SERVICE.otp.send_link` (emails reset link) | **present** at runtime via platform services (server-team `service/otp.js`), though not in static `lex/services.json` | forgot view uses `SERVICE.yp.email_exists` → `SERVICE.otp.send_link` (same flow as the signin app); send_link emails the styled `reset-password.html` template and the link lands on `#/welcome/reset/{uid}/{token}` |
| `Platform.get('legals')` external T&C URLs | not used here | terms handlers open existing `#/welcome/privacy` / `#/welcome/terms` routes |
| `ico: "logo-apple"` | **present** in `icons/sprites/normalized.sprite.svg` (`--icon-logo-apple`) | use directly; no asset work |
| LOCALE keys (`CHECK_YOUR_INBOX`, `SEND_RESET_LINK`, `CONTINUE_WITH_APPLEID`, `REMEMBER_PASSWORD`, `LOG_IN_NOW`, `RESET_PASSWORD_TITLE`, `WE_SENT_LINK_TO`, `LINK_EXPIRES_NOTE`, `CHECK_SPAM_NOTE`, `TERM_OF_SERVICE`, …) | many missing from lex | use `LOCALE.X || "English fallback"` so UI degrades gracefully; adding keys to lex is a follow-up |

## Architecture — how views mount (no new card chrome)

ui-team builds the card chrome once in `skeleton/index.js`
(`__skl_welcome_signin`): logo → `__container` → `__header` slot → `__content`
slot. The module feeds `{header, content}` via `this._skeleton(this, opt)`.

The new views return **content only** and are fed into the existing
`this.__content` part — exactly as `prompt_otp()` already does
(`this.__content.feed(require("./skeleton/otp")(this))`). They therefore inherit
the card, logo, and org-aware header rather than re-declaring a standalone
wrapper+card the way the signin app does.

State machine for the card's content region:

```
showSignin()      -> __content := skeleton/content       (default; onDomRefresh)
  └─ "reset-password" ─────────────────────────────────┐
showForgot()      -> __content := skeleton/forgot         │
  └─ "forgot-submit" (valid) ──> showCheckInbox()         │
showCheckInbox()  -> __content := skeleton/check-inbox     │
  └─ "back-to-signin" / "Log in now" ────────────────────┘ (back to showSignin)
```

Reconnect mode keeps its existing reduced content (`content.js` already branches
on `dataset.mode == "reconnect"`); forgot/check-inbox are full-form-only.

## Detailed design

### 1. `skeleton/content.js` (edit) — sign-in card content
- Add an in-form **forgot-row** below the password field: a `Note` with
  `service: "reset-password"`, `uiHandler: [ui]`, content
  `LOCALE.Q_FORGOT_PASSWORD` ("Forgot password?"). Replaces the current
  cloud-only `helper` link.
- In the social cluster, add a second `social-button` for **Apple**
  (`ico: "logo-apple"`, `service: "use-apple"`); change Google's service from
  the dead `google-signin` to `use-google`. Keep the `or` divider.
- Replace `legalLinks` with a **terms-container**: two `Note`s
  (`see-privacy-terms`, `see-services-terms`) separated by a `•` dot, matching
  the signin app's `termsAndConditions()` structure.
- Reconnect branch unchanged (form + forgot link only).

### 2. `skeleton/forgot.js` (new) — inline forgot-password view
Returns content (for `this.__content`): centered logo + title
(`RESET_PASSWORD_TITLE`), a labelled email input
(`service: "forgot-input"`, `sys_pn: ref-ident`, `app-mail` icon), an inline
error `Note` (`sys_pn: message`), a submit button
(`service: "forgot-submit"`, `sys_pn: "button-confirm"` via the existing
`skeleton/common/button` helper), and a "Remember password? Log in now →" row
(`service: "back-to-signin"`). Pre-fills the email from `ui.mget(username)`.

### 3. `skeleton/check-inbox.js` (new) — inline check-inbox view
Returns content: envelope icon in a soft-primary circle, "Check your inbox"
title, "We've sent a password reset link to" + the email, a **resend** button
(`service: "resend-email"`, `sys_pn: "resend-button"`, `refresh-view` icon),
"Log in now →" (`back-to-signin`), and footer notes (link expiry / spam).

### 4. `skeleton/index.js` (edit, if needed)
`content.js` is wrapped by `__skl_welcome_signin`. forgot/check-inbox are fed
straight into `this.__content`, so no change is expected here — confirm the
content slot is reused and not duplicated.

### 5. `index.js` (edit) — handlers + methods
Add to `onUiEvent` (before `default: super.onUiEvent`):
- `reset-password` → `showForgot()`
- `forgot-input` (only on `commit`/`Enter`) → fallthrough to `forgot-submit`
- `forgot-submit` → `submitForgot()`
- `back-to-signin` → clear cooldown, `showSignin()`
- `resend-email` → guard on cooldown, resend via `otp.send_link`, restart cooldown
- `see-privacy-terms` / `see-services-terms` → open `#/welcome/privacy` /
  `#/welcome/terms`
- `use-google` / `use-apple` → **placeholder**: no-op or a transient
  "coming soon" message (no `initiate` service exists)

Add methods:
- `showSignin()` — re-feed `skeleton/content` into `this.__content` (factor out
  of `onDomRefresh`/`auth`).
- `showForgot()` — feed `skeleton/forgot`.
- `showCheckInbox()` — feed `skeleton/check-inbox`, start cooldown, attach the
  `storage` listener for `drumee:password-reset:done` (already emitted by
  `welcome/reset`'s `showSuccess()`); disable resend if it fires.
- `submitForgot()` — trim + validate email format → `yp.email_exists` → on hit,
  `otp.send_link({ email, socket_id })` → on `data.sent`, `showCheckInbox()`; on
  miss/format error, inline message. (Mirrors the signin app's `submitForgot`,
  including `socket_id` from `Visitor.get(_a.socket_id)`.)
- `_startCooldown(sec)` / `_endCooldown()` / `_fmt(sec)` — port the resend
  countdown, **adapted to ui-team's button**: the common button renders a
  `button-confirm` `Note` whose text content is the label, so the countdown
  updates that Note's `textContent` and toggles a `data-counting` dataset (no
  `.btn` span as in the signin app).
- `onDestroy()` — clear the cooldown interval and remove the `storage` listener.

Login (`yp.login`), `checkLoginStatus`, OTP, reconnect, company-URL,
cross-signin, gateway: **unchanged**.

### 6. `skin/index.scss` (edit) — styles
Port the relevant rules from the signin app's `form/skin/index.scss`,
re-namespaced from `.signin-form` to `.welcome-signin` and using the existing
drumee tokens/`drumee.typo` mixin already in the file. Add:
`__forgot-row` / `__forgot-link`; forgot view (`__forgot`, `__forgot-head`,
`__forgot-logo(-icon)`, `__forgot-title`, `__forgot-field`, `__forgot-actions`);
check-inbox view (`__inbox-icon`, `__envelope`, `__inbox-heading/title/subtext/
sent/email/footer/note`, `__inbox-actions` incl. `data-counting` /
`data-disabled` states); `__terms-container` / `__terms-link` / `__terms-dot`;
and styling for the second (Apple) `__social-button`. Reuse the existing
`loader` keyframes for spinners.

## Known gaps / follow-ups (out of scope here)

1. **Social OAuth backend** — `use-google` / `use-apple` are inert until a
   sign-in `initiate` service exists. Buttons are intentionally visual.
2. **LOCALE keys** — add the missing keys to lex for i18n; English fallbacks
   ship in the meantime.
3. **`Platform.legals`** — if external legal URLs are later provided, the terms
   handlers can switch from routes to those URLs.
4. **`welcome/reset` request page** — its own "enter email" step becomes
   redundant for users coming through signin, but is left intact (other entry
   points, and the link-landing path, still use the module).

## Verification

- Manual: sign-in still works (credentials → `yp.login` → OTP/cross-signin paths
  intact); forgot link → forgot view → valid email → check-inbox; resend
  cooldown counts down and re-enables; "Log in now" returns to sign-in; reset
  email link still lands on `welcome/reset` and completes; reconnect popup
  unaffected; Google/Apple buttons render with correct icons.
- Visual: compare against Figma `5:73985` at desktop width.
- Confirm no regression in `cross-signin`, `gateway`, `url`, `otp`,
  `otp-reconnect` views.
