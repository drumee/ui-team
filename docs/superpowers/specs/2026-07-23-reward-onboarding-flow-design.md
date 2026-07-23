# Reward Onboarding Flow — Design

**Date:** 2026-07-23
**Figma:** [Drumee › Email marketing](https://www.figma.com/design/g5V3PjhNMf5bHlsHMvV17w/Drumee?node-id=3275-236091) (section `3275:236091`)
**Repo:** `ui-team`

## Summary

A 3-step, reward-framed activation flow shown to users who arrive from the
"Claim Your Free Storage Today" marketing email. It runs inside the desk, after
the existing 5-step tutorial, and walks the user through *upload a file* and
*invite a teammate* before showing a congratulations screen.

The flow is **UI-only**. No entitlement is granted, no service is called to
record the claim, and no schema changes.

## Scope

**In scope**

- New widget `reward_flow` under `src/drumee/builtins/widget/reward-flow/`
- Registration in `src/drumee/seeds.js`
- Trigger + one event relay in `src/drumee/modules/desk/index.js`
- New locale keys in `locale/{en,fr,es,ru,km,zh}.json`
- CTA `href` change in the existing email template (`loby/emailing/`)

**Out of scope**

- Any backend work: no loby service, no `yp.quota` write, no reward/campaign
  table, no eligibility check. "5 years of unlimited storage" is copy only.
- The email template body — it already exists and is unchanged apart from the
  CTA link.
- The `signup` repo — its existing `captureUtm()` already carries the campaign
  marker, so no change is required there.
- `src/drumee/modules/desk/tutorial/` — the existing 5-step tour is not
  modified, imported from, or reordered.

## Design source

Frames read from the Figma section:

| Figma node | Screen | Copy |
|---|---|---|
| `3275:236259` | Email (exists) | "Claim Your Free Storage Today" → CTA **Claim free storage** |
| `3275:236154` | Sign-up modal (exists) | "Welcome to DRUMEE" |
| `3275:236196` | Step 1 | **Step 1: Create your Workspace** — "You're already in! Your workspace is ready for action." → *Continue* |
| `3275:236332` | Step 2 | **Step 2: Upload your first file** — "Upload any file, and activate your storage instantly." → *Back* / *Upload* |
| `3275:236421` | Step 3 | **Step 3: Invite a teammate** — "Click Invite and add at least 1 member. Real collaboration starts now!" → *Back* / *Invite member* |
| `3275:236498` | Invite modal (exists) | "Invite your team members" → *Send Invitation* |
| `3275:236554` | Drop modal | **Don't drop now** — "You are super close to the reward." → *Drop anyway* / *Continue* |
| `3275:236463` | Congrats | **Congratulations!** — "You've successfully claimed your 5 years of unlimited storage! Welcome to Drumee." → *Go to dashboard* |

Steps 1–3 sit on a flat `DARK VIGNETTE`. The drop and congrats modals sit on the
`Overlay+OverlayBlur` component. Each step card carries a 3-segment progress bar,
an icon chip, title, description and one or two buttons. Steps 2 and 3 anchor
top-right with a hand-drawn arrow vector pointing at their target control.

## Divergences from Figma

These are deliberate and were agreed during design:

1. **Step 1 renders in the desk, not on the sign-up gradient.** Figma draws it on
   the welcome background immediately post-signup. Because the flow runs after
   the 5-step tutorial, placing Step 1 there would separate it from Steps 2–3 by
   the onboarding questionnaire *and* the whole tour, making the 3-segment
   progress bar span an unrelated gap. All three steps therefore run
   contiguously in the desk, on the same vignette. Card design is unchanged.
2. **Waiting states are added.** Figma shows no state between "user clicks
   Upload" and "file has landed". The flow needs one, because the user must be
   able to reach the uploader and the invite popup — see *State machine* below.

## Existing code this builds on

| What | Where | Used for |
|---|---|---|
| `RADIO_MEDIA.trigger(_e.uploaded, data)` | `src/drumee/builtins/media/uploader/index.js:170` | Step 2 completion signal |
| `triggerHandlers({ service: "invitation-sent", … })` | `src/drumee/builtins/widget/invite-popup/index.js:729` | Step 3 completion signal; fires only after `hub.invite` resolves without error |
| `invite_popup` widget | `src/drumee/builtins/widget/invite-popup/` | Step 3's modal — opened by kind, not modified |
| `Wm.__wrapperModal` + `dataset.overlay = "blur"` | used by `invite-popup` and `desk/index.js:2162` | Drop and congrats modals |
| `Visitor.parseModuleArgs()` | `src/drumee/modules/desk/index.js:1167` | Dev override param |
| `_e.upload` service on the topbar | `src/drumee/modules/desk/skeleton/topbar.js:74` | Step 2's arrow target and the action its button fires |

## Architecture

A self-contained widget. It reuses only public surfaces (`Wm`, `RADIO_MEDIA`,
`Kind`), never reaching into `desk/tutorial/` internals, so the existing tour
cannot regress.

```
src/drumee/builtins/widget/reward-flow/
  index.js            orchestrator — step index, gating, event wiring, teardown
  skeleton/index.js   vignette + arrow + card host
  skeleton/card.js    step card: progress bar, icon chip, title, desc, buttons
  skeleton/modal.js   drop + congrats bodies, fed into Wm.__wrapperModal
  skin/index.scss     vignette, card, progress bar, arrow, modal
```

Each unit has one job: `index.js` owns all state and is the only thing that
talks to the rest of the app; `card.js` is a pure function of
`{step, title, desc, icon, buttons}`; `modal.js` is a pure function of
`{title, desc, buttons}`. Neither skeleton holds state or knows what step it is.

**Edits to existing files** — three, all additive:

- `src/drumee/seeds.js` — add `reward_flow: () => import("./builtins/widget/reward-flow/index")`
- `src/drumee/modules/desk/index.js` — mount trigger, plus relay the
  `invitation-sent` UI event to the flow when it is active
- `locale/*.json` — new keys (see *Copy* below)

## Entry and gating

Entirely client-side; nothing is read back from the server.

The campaign is identified by `utm_campaign=free-storage`. This needs **no new
capture code**: `signup/src/widgets/router/index.js` already has `captureUtm()`,
which reads `utm_source`/`utm_medium`/`utm_campaign` from the hash args *and*
the page query string, persists them to `localStorage.drumee_utm`, and forwards
them to `create_account`. Reusing it also keeps `?ref=` clean — `ref` is a
referral *member handle*, and overloading it with a campaign name would corrupt
referral attribution.

```
email CTA   →  signup URL carrying ?utm_campaign=free-storage
signup app  →  existing captureUtm() writes localStorage.drumee_utm
                 = {"utm_campaign":"free-storage", …}          (no change needed)
desk        →  once desk_tutorial destroys (or immediately when tutorial_done),
               if drumee_utm.utm_campaign === "free-storage"
               and reward_flow_done is not set:
                 mount { kind: "reward_flow" } into the desk overlay part
exit        →  reward_flow_done = "1"; reward_step removed.
               drumee_utm is left alone — it is not ours to clear.
```

**Risk to verify first:** `localStorage` is per-origin. This works only if the
signup page and the desk are served from the same origin. If signup lives on a
different host or subdomain, `drumee_utm` will not be visible to the desk and
the gate needs a different carrier — most likely a `?reward=1` param appended to
the post-signup redirect. Confirm the origins before building; the rest of the
design is unaffected either way.

`reward_flow_done` is the permanent latch — once set, the flow never mounts
again on that browser. A dev override `?reward=1` read through
`Visitor.parseModuleArgs()` mounts the flow regardless of the marker, mirroring
the existing `?tutorial` param. When the flow was mounted by the override,
exiting it writes neither `reward_flow_done` nor any other marker, so the
override stays repeatable and cannot mask a real campaign run.

Consequence accepted: a user who clears localStorage or switches device never
sees the flow. That is acceptable for a marketing nicety and is the cost of the
UI-only decision.

## State machine

`index.js` holds `_step` (one of the states below) and `_furthest` (highest step
index reached, which drives the progress bar).

| From | Event | To |
|---|---|---|
| `step1` | *Continue* | `step2` |
| `step2` | *Upload* — fires `_e.upload` at the desk | `step2_waiting` |
| `step2_waiting` | `RADIO_MEDIA` `_e.uploaded` | `step3` |
| `step2_waiting` | uploader closed with no upload | `step2` |
| `step3` | *Invite member* — opens `invite_popup` with `uiHandler: [this]` | `step3_waiting` |
| `step3_waiting` | `invitation-sent` | `congrats` |
| `step3_waiting` | invite popup destroyed without sending | `step3` |
| `step2`, `step3` | *Back* | previous step |
| `step1`–`step3` | Esc, or click on the vignette | `drop` |
| `drop` | *Continue* | the step it was opened from |
| `drop` | *Drop anyway* | done |
| `congrats` | *Go to dashboard* | done |

`step1` renders without a *Back* button, matching Figma. Waiting states have no
buttons.

**Back is navigation only.** Completed steps stay completed: going back from
step 3 to step 2 does not require re-uploading, and *Continue* returns straight
to step 3. The progress bar reflects `_furthest`, so it never rewinds.

**Step 2 target:** the topbar upload control in the current workspace. The
step's *Upload* button fires the same `_e.upload` service the topbar fires, and
the arrow points at that control. Any `_e.uploaded` broadcast completes the
step, including one from a drag-drop the user did instead.

**Waiting states must not block the app.** On entering `step2_waiting` or
`step3_waiting` the host gets `data-state="waiting"`: the vignette and card go
`pointer-events: none` and dim, so the uploader and the invite popup are fully
usable. Restoring on cancel is what the two "closed without succeeding" rows
above cover.

## Rendering

- **Progress bar** — 3 segments; segment *n* is filled when `_furthest >= n`.
- **Vignette** — a full-surface dark layer, no cutout. Steps 1–3 only.
- **Blur modals** — drop and congrats are fed into `Wm.__wrapperModal` with
  `dataset.overlay = "blur"`, the same path `invite-popup` uses.
- **Arrow** — inline SVG asset. Note that ui-team's webpack inlines `.svg`
  through `url-loader`.
- **Anchoring** — steps 2 and 3 position top-right, absolute within the desk
  overlay. The arrow points at that step's target control: upward to the topbar
  upload control on step 2, and at the invite control on step 3. Exact offsets
  and rotation are taken from the Figma frames at build time rather than fixed
  here.

## Copy

All strings go through `LOCALE`; nothing is hardcoded. New keys, added to
`en.json` first and then the other five locale files:

```
REWARD_STEP1_TITLE   "Step 1: Create your Workspace"
REWARD_STEP1_DESC    "You're already in! Your workspace is ready for action."
REWARD_STEP2_TITLE   "Step 2: Upload your first file"
REWARD_STEP2_DESC    "Upload any file, and activate your storage instantly."
REWARD_STEP3_TITLE   "Step 3: Invite a teammate"
REWARD_STEP3_DESC    "Click Invite and add at least 1 member. Real collaboration starts now!"
REWARD_DROP_TITLE    "Don't drop now"
REWARD_DROP_DESC     "You are super close to the reward."
REWARD_DROP_LEAVE    "Drop anyway"
REWARD_CONGRATS_TITLE "Congratulations!"
REWARD_CONGRATS_DESC  "You've successfully claimed your 5 years of unlimited storage! Welcome to Drumee."
REWARD_GO_DASHBOARD  "Go to dashboard"
REWARD_CONTINUE      "Continue"
REWARD_UPLOAD        "Upload"
REWARD_INVITE        "Invite member"
```

`BACK` already exists (`locale/en.json:26`) and is reused.

The congratulations line renders "5 years of unlimited storage" in the accent
colour, per Figma. It is a styled span within the localised string, so
translators keep control of word order.

## Edge cases

| Case | Behaviour |
|---|---|
| Page reloaded mid-flow | `localStorage.reward_step` is written on every transition; the flow resumes at that step. Waiting states resume as their base step. |
| `Wm.__wrapperModal` unavailable | Drop and congrats fall back to an inline card on the vignette. |
| Invite popup already open when step 3 starts | Do not open a second one; attach to the existing instance. |
| Upload fails or is cancelled | Stays on step 2, card restored. No error surfaced by the flow — the uploader owns that. |
| Invite partially fails | `invitation-sent` still fires (invite-popup surfaces the partial failure itself), so the step completes. |
| Tutorial still running | The flow waits for `desk_tutorial` to destroy before mounting. |
| localStorage cleared | Flow never runs. Accepted. |
| User is not a campaign user | Flow never mounts; nothing changes for them. |

## Verification

`ui-team` has no test runner, so verification is compile + visual + manual:

1. **SCSS compiles standalone** — `sass -I . -I skin` on the new stylesheet.
2. **Visual check** — headless chromium harness rendering the card, vignette,
   progress bar at all three fill levels, and both modals.
3. **Manual click-through** on local.drumee with `?reward=1`:
   step 1 → 2 → real upload → 3 → real invite → congrats; then Back from 3 to 2
   and forward again (progress must not rewind); then Esc at each step to
   confirm the drop modal, *Continue* returning to the right step, and *Drop
   anyway* latching the flow off.
4. **Regression check** — run the existing 5-step tutorial with `?tutorial` and
   confirm it is unchanged and that the reward flow starts only after it ends.

Both completion signals are exercisable locally: uploads and `hub.invite` both
work on this box.

## Work outside ui-team

One change, in `loby/emailing/`: the existing email template's CTA `href` gains
`?utm_campaign=free-storage` (alongside whatever `utm_source`/`utm_medium` the
campaign wants). Without it the flow never triggers for real users.

The `signup` repo needs **no change** — `captureUtm()` already does the work.
