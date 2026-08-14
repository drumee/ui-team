# OAuth sign-in (Google / Apple) in the built-in welcome/signin module

**Date:** 2026-08-11
**Status:** approved
**Touches:** ui-team (client), loby (callback error handling), schemas (oauth_state.ref)

## Problem

`welcome/signin` already renders "Continue with Google" and "Continue with
Apple" — `skeleton/content.js` draws both — but the click handler was a stub:

```js
// ---- Social sign-in (no initiate service on this server yet) ----
case "use-google":
case "use-apple":
  return this.renderMessage(LOCALE.COMING_SOON || "Coming soon");
```

The server side has existed for a while in the `loby` plugin
(`google.initiate` / `google.callback`, `apple.*`, `oauth.verify_otp` /
`resend_otp` / `cancel_otp`), and the standalone **signin plugin**
(`@drumee/signin`) drives it. The built-in module — which is what
`welcome/index.js -> loadSignin()` falls back to whenever
`Platform.get('plugins').signin` is absent — never learned how.

## What the flow already does without us

Worth stating, because it bounds the work: the non-2FA return leg needs no client
code at all. `google.callback` finishes by serving `account-created.html`, which
either redirects to the desk (existing sign-in) or shows the welcome card whose
CTA continues there (new account). The browser is handed a finalized session
cookie by `sendHtml`. So the client is responsible for exactly three things:

1. starting the flow (`initiate` → provider redirect),
2. the 2FA return leg, which loby cannot finish on its own,
3. the failure return leg.

## Two things that make this non-obvious

### 1. The OAuth return collides with the password-2FA branch

`session_check_cookie` derives `connection` from the **otp table**, not from
`cookie.status`:

```sql
SELECT o.secret, IF(unix_timestamp() < (o.ctime + 600), 0, 1) expired
  FROM otp o INNER JOIN cookie c ON c.uid=o.uid
  WHERE c.id=_sid ... INTO _secret, _expired;
IF _secret IS NULL THEN SELECT 'ok' INTO _connection;
ELSE ... SELECT 'otp' INTO _connection;
```

After `google.callback` hits the 2FA gate it has done both things that satisfy
that query: `session_login_with_oauth` set `cookie.uid` and left
`status='otp_pending'`, and `_send2faOtp` minted an `otp` row. So the page the
user lands on reports **`connection: 'otp'`** — the same value a
password-plus-2FA sign-in produces.

`onDomRefresh` switches on exactly that value, and its `case "otp"` calls
`prompt_otp({secret: Visitor.get("otp_key")})`, which posts to `yp.authenticate`
with a client-side secret. On the OAuth path there is no client-side secret by
design. So the OAuth hand-off **must** be tested before the switch. (The signin
plugin's router orders it the same way, which is why it works there.)

### 2. `dtk_otp` does not recognise `verify_otp`'s failure shape

`oauth.verify_otp` answers `{status:'success'}` or `{status:'error'}`. The
widget classifies responses with:

```js
const errStatus = ['wrong-code', 'no-user', 'no-socket', 'expired', 'invalid',
                   'INVALID_CODE', 'INVALID_SECRET'];
```

`'error'` is not on it, and the response carries no `error` key — so a mistyped
code reads as **success**, fires the host's success service and reloads. The user
gets a blank OTP screen back with no explanation.

Fixed by wrapping the instance's `postService` and normalizing the response
before the widget inspects it. Wrapping rather than patching `dtk_otp` keeps the
change off the reconnect and password-reset screens, whose APIs already answer in
shapes it understands. `builtins/widget/otp-gate` wraps the same method for its
own submit spinner, so this is an established idiom here.

## Design

### ui-team

**`skeleton/content.js`** — gate the divider and the social block on
`SERVICE.google.initiate` / `SERVICE.apple.initiate`, per provider. These
services reach the client through `Platform.get('services')`, so an install
without loby simply has none, and a button that cannot start a flow should not be
drawn. Empty-string kids are the file's existing idiom for a conditional child
(`forgotRow`, `signupPrompt`).

**`index.js`**

| Piece | Behaviour |
|---|---|
| `startOauth(provider)` | POST `<provider>.initiate`; on `{status:'prompt', authUrl}` set `location.href`. The URL must come from `initiate` — it also writes the single-use `oauth_state` row carrying this session id, which is how the cross-site callback finds its way back to this visitor. Spinner stays up through the navigation so a second click cannot mint a second state row. |
| `_oauthMfaParams()` | `oauth_mfa=1` + decoded `email`, via `Visitor.parseModuleArgs()` (splits on `[#/&?]`, does **not** decode). Returns null — and warns — when `oauth.verify_otp` is unregistered; the sign-in form beats a screen that cannot submit. |
| `_oauthErrorParam()` / `_oauthErrorMessage()` | Map loby's reasons to lexicon copy. `default` collapses to a generic line so no internal token can reach the screen. |
| `onDomRefresh` | `oauth_mfa` first (see above), then `oauth_error`, then the existing switch untouched. |
| `_promptOtpOauth(email)` | Registers `dtk_otp` on demand and feeds `skeleton/otp-oauth.js` — mirrors `_promptOtpReconnect`, since this bundle does not run the widget's `loadSeeds()`. |
| `_armOauthOtp(otp)` | The response normalization above. Idempotent. |
| `_resendOauthOtp()` | Host-driven (`resendService`): the widget assigns its resend *response* over `payload`, and `resend_otp` answers `{status:'ok'}`, which would wipe the email the copy is built from. Clears the digit boxes, per the `otp-gate` resend contract. |
| `back-to-signin` | In the OAuth screen, POST `oauth.cancel_otp` first. Nothing else can clear that cookie: `session_logout` matches by uid, which a never-authenticated session lacks, so a plain reload lands straight back on the OTP screen. Best-effort — we return to the form either way. |
| `oauth-otp-verified` | Scrub the hand-off params, then reload. `verify_otp` returns only a status, so there is no payload to feed `gotSignedIn`; and reloading with `oauth_mfa=1` still set would re-enter the OTP screen against a session that is already finalized. |

**`skeleton/otp-oauth.js`** (new) — `dtk_otp` (6 numeric boxes, `api:
SERVICE.oauth.verify_otp`, `service: 'oauth-otp-verified'`) plus a "Back to sign
in" row. The payload deliberately carries **no secret**: on this path it never
leaves the server, and `verify_otp` resolves it from the pending session. The
back link sits beside the widget rather than inside it because leaving needs a
server round-trip the widget knows nothing about.

**`skin/index.scss`** — the existing `&__items.reconnect` block already reshapes
`dtk_otp` from its full-page default (52×72 cells, 180px top offset) into the
`otp-gate` card. The OAuth screen occupies the same content slot, so it joins
that selector rather than re-deriving it. Adds `&__backlink-row` / `&__backlink`.

Note for anyone extending that block: `drumee.typo()` maps `$weight` to a
*font-family* and only handles 300/400/500/700, so `$weight: 600` emits nothing —
the semibold face has to be named explicitly, as `__social-label` already does.

### loby

- `apple.callback` had no error handling whatsoever: no try/catch, and
  `if (!res.error)` with no `else`. `oauth_not_linked`, a failed token exchange
  or a JWKS failure therefore returned **nothing at all** to the browser. Brought
  to parity with `google.callback` (`sendOauthError`), which is also what makes
  the new client-side `oauth_error` handling reachable on the Apple path.
- Stripped the `AAA:` / `AAAA:` debug logs — including `apple.js:152`, which
  dumped the whole verified ID-token payload (email, `sub`) into the server log
  on every Apple sign-in — and the dead `handleAppleResponse`.

### schemas

`initiate` writes `oauth_state (state, session_id, ref, ctime)` for referral
attribution, with a try/catch falling back to a 3-column insert "on a DB without
the optional ref column". No schema in the repo has that column — not
`tables/oauth_state.sql`, not `templates/factory/seed/yp.sql` — so on a freshly
seeded database the fallback fires on **every** OAuth sign-in and referral
attribution is silently lost. Adds the patch, the column, and a manifest entry.

## Testing

The flow cannot be exercised on this box: `yp` here has no `oauth_accounts` or
`oauth_state` tables, so `initiate` fails before it can redirect. (The locally
deployed `session_login_with_oauth` is also older than the repo's — it has the
`otp_pending` branch but not the STEP 1b Drive-pollution guard.) So no live
provider round-trip was performed, and none of the claims below rest on one.

- `tests/welcome-signin-oauth.test.js` — 33 `node:test` cases driving the real
  module, with only the bundle surroundings stubbed. Covers the ordering
  guarantee in both directions, the error-shape normalization, the
  no-secret-in-payload invariant, initiate success/refusal/rejection, resend,
  cancel-on-leave, and per-provider button gating.
- `sass` compile of `skin/index.scss` against the webpack load paths.

## Not done

- No lexicon keys were added. New copy uses the `LOCALE.X || "fallback"` pattern
  already used throughout this module, so the screens read correctly in English
  before translation and pick the keys up when they land:
  `BACK_TO_SIGN_IN`, `SIGNIN_CANCELLED`, `OAUTH_NOT_LINKED`.
- `oauth_not_linked` gets explanatory copy but no action. The productive version
  offers "sign in with your password and link it in settings" as a flow rather
  than as a sentence; that needs a linking surface in account settings, which is
  out of scope here.
