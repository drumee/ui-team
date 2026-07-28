# Claim-reward email CTA → reward-flow wiring

Date: 2026-07-26

## Problem

The "Claim free storage" CTA in the campaign email is wired to nothing.

`analytics-server`'s `claim_reward()` mails every drumate whose
`profile.$.category` is `"trial"`, with the CTA defaulting to a bare
`https://{main_domain}/-/`. The desk widget that email is advertising —
`reward_flow` — gates itself on `isEligible()`, which returns true only when
`localStorage.drumee_utm` parses to `utm_campaign === "free-storage"`.

The only writer of `drumee_utm` is the **signup** app
(`signup/src/widgets/router/index.js` `captureUtm`). Recipients already have
accounts, so they land on the desk signed in, the signup router never runs, the
marker is never written, `isEligible()` is false, and the flow never mounts.

Two things are missing: a campaign-bearing CTA URL, and a desk-side capture of
that marker.

## Design

### Data flow

```
email CTA (#/desk?utm_campaign=free-storage)
  └─ signed out → welcome module captures  ─┐
  └─ signed in  → desk module captures      ─┴─→ localStorage.drumee_utm
                                                  │
       desk onPartReady("overlay") → +2s → _maybeStartRewardFlow()
                                                  │
                                    reward_flow.isEligible() → true → mount
```

Nothing in `reward-flow` or the desk's existing gating logic changes. The only
new behaviour is persisting the marker.

### 1. `src/drumee/libs/campaign.js` (new)

Single export `captureUtm()`.

- Reads `utm_source` / `utm_medium` / `utm_campaign` from
  `Visitor.parseModuleArgs()` first, then `location.search`.
- Writes `localStorage.drumee_utm` as JSON only when at least one param is
  present. When none are present an existing value is left untouched — never
  cleared.
- Values are trimmed and clamped to 64 chars.
- All storage access is wrapped in try/catch: private mode degrades to no-flow,
  never a throw.

This duplicates the contract of `signup/src/widgets/router/index.js`
`captureUtm` byte for byte. The two apps are separate repos and cannot share a
module, so the duplication is deliberate; both sides carry a comment naming the
other.

### 2. Call sites

- **`src/drumee/modules/welcome/index.js`** `onDomRefresh` — alongside the
  existing `return_to` / `hub_id` deep-link captures. Covers the signed-out
  click. `localStorage` survives the post-login full page reload on its own, so
  this needs no `sessionStorage` relay like `return_to` does.
- **`src/drumee/modules/desk/index.js`** `onDomRefresh` — covers the signed-in
  click, which is the main audience. Runs well before the 2s-delayed
  `_maybeStartRewardFlow()`.

### 3. `analytics-server` — `service/index.js` `claim_reward()`

Default CTA becomes:

```
https://{main_domain}/-/#/desk?utm_source=email&utm_medium=email&utm_campaign=free-storage
```

A caller-supplied `link` gets the same trio appended when it does not already
carry `utm_campaign`. Without those params the CTA silently does nothing, so a
bare custom link is a footgun worth closing rather than documenting.

`free-storage` must match `CAMPAIGN` in
`ui-team/src/drumee/builtins/widget/reward-flow/index.js`. Both sides carry a
comment naming the other.

### URL shape

`Visitor.parseModuleArgs()` splits `location.hash` on `[#/&?]` and takes `k=v`
pairs, so `#/desk?utm_source=email&utm_medium=email&utm_campaign=free-storage`
yields all three keys. The search-string branch exists for links that put the
params before the hash.

## Edge cases (all already handled upstream)

- `reward_flow_done=1` suppresses a re-run for users who finished **or**
  dismissed the flow — `_finish()` latches on both "Drop anyway" and "Go to
  dashboard", so a captured marker cannot re-nag forever.
- A repeat click just rewrites the same marker.
- Private-mode / quota storage failures degrade to no-flow.

## Verification

Cannot be click-tested end to end on this box: it serves only `local.drumee`,
and the real path needs a campaign mail send.

- Unit-test `captureUtm()` against hash-arg and search-string inputs, including
  the no-params case (must not clear an existing marker).
- Load the desk with the campaign hash by hand, confirm `drumee_utm` is written
  and the flow mounts.
- Confirm the ui-team build still passes.
