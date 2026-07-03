# Rating Survey Popup (PMF) — Design

**Date:** 2026-07-02 · **Status:** Approved (brainstormed with owner)
**Figma:** [rating popup](https://www.figma.com/design/g5V3PjhNMf5bHlsHMvV17w/Drumee?node-id=2144-128133) · [survey](https://www.figma.com/design/g5V3PjhNMf5bHlsHMvV17w/Drumee?node-id=2144-173302) · [thanks](https://www.figma.com/design/g5V3PjhNMf5bHlsHMvV17w/Drumee?node-id=2144-173408)
**Survey content source:** `Drumee_PMF_Program.md` (repo root) — PMF Validation Survey v1.0 (Part A: Q1–Q8, Part B: QB1–QB5)

## Goal

After a user has accumulated **30 minutes of active Drumee usage**, show a rating popup
(1–5 stars, star count reveals a matching message). Its primary CTA **"Take the survey"**
opens the full PMF survey **in-app** (13 questions, wizard). Responses are stored
server-side in a new `survey_response` table. Never nag: **one response per user, ever**,
with a **remind-later (7 days)** escape hatch.

## Decisions (locked with owner)

| Question | Decision |
|---|---|
| "30 minutes" semantics | **Cumulative across sessions, active-tab time only** (paused while `document.hidden`) |
| Re-show policy | **Once ever** after submit; dismiss/X/"Để sau" = **remind later, 7 days** |
| Storage | **New DB table `yp.survey_response`** via new `SERVICE.survey.*` endpoints |
| Full survey | **In-app** (not Google Form), inside the same popup as a wizard |
| UI architecture | **A — one popup widget with a state machine** (rating → survey wizard → thanks) |
| "Shown/done" flag | **Server-side profile flag** (cross-device), not localStorage |

## Architecture

Three units, each independently testable:

1. **Usage timer** (desk module) — accumulates active seconds, fires the launch.
2. **Popup widget** `rating_survey_popup` (new, `builtins/widget/rating-survey-popup/`) — pure UI state machine; knows nothing about the timer.
3. **Backend** `SERVICE.survey.*` (server-team + schemas) — eligibility state, submit, dismiss.

### 1 · Usage timer (ui-team, desk module)

Location: `src/drumee/modules/desk/index.js` — start from `onDomRefresh()` next to the
existing gdrive auto-launch (`_maybeAutoLaunchGDriveMigration`, ~line 307–344), as
`_initRatingSurveyTimer()`.

- On desk load: `fetchService(SERVICE.survey.get_state)` → `{ done, snooze_until }`.
  - `done` → return (never show again).
  - `snooze_until > now` → return (snoozed).
  - Not `Visitor.profile().onboarded` → return (skip users still onboarding).
- Else start the accumulator:
  - `setInterval` tick every **5s**; add 5s **only when `!document.hidden`**.
  - Persist running total to `localStorage['drumee-usage-seconds']` each tick
    (plain `JSON`/number, per the messenger `recentEmojis` convention — no helper exists).
  - Threshold: **1800s**. On crossing: stop the interval, **re-fetch `get_state`**
    (guards the two-tab race — the other tab may have already shown/submitted), then
    `await Kind.waitFor("rating_survey_popup")` and
    `Wm.launch({ kind: "rating_survey_popup", wm_unique_id: "rating_survey_popup" }, { explicit: 1, singleton: 1 })`.
- Multi-tab: double-counting seconds across tabs is accepted (harmless); the
  pre-launch `get_state` re-check plus the singleton `wm_unique_id` prevent double popups.
- localStorage cleared → counter restarts from 0. Accepted: the server `done` flag is
  the source of truth for "never again"; the counter only delays the first show.
- DMZ/guest users never see it (the timer lives in the desk module, which they never load).

### 2 · Popup widget (ui-team)

New `src/drumee/builtins/widget/rating-survey-popup/{index.js, skeleton/, skin/}`,
registered in `src/drumee/seeds.js` as `rating_survey_popup`. Clone the
`migrate-gdrive-popup` scaffold **verbatim** for the popup mechanics:

- `class __rating_survey_popup extends LetcBox`, `static initClass(){ require("./skin") }`.
- `_portalToBody()` (moves `this.el` to `document.body` — required to beat the Settings
  overlay z-stack) and the `raise()` stub (required by `Wm.launch({singleton:1})` relaunch).
- All buttons dispatch through one `onUiEvent(cmd, args)` switch.
- Close via `parent.clear()` (never `goodbye()` — Wrapper data-state gotcha).

**State machine** (`this._state`, re-render via `feed(require("./skeleton")(this))`):

| State | Content | Actions |
|---|---|---|
| `rating` | Title + 5-star row (`ico: "app-rating-star"`, `dataset.on` highlight — logic copied from `window/meeting/skeleton/feedback.js` + `meeting/index.js:_setRating`) + **per-star message** `RATING_SURVEY_MSG_1..5` shown once a star is picked (copy verified against Figma later) | `[Để sau]` → `_dismiss()`; `[Take the survey]` (primary, disabled until a star is picked) → **submit score immediately** (`survey.submit { score }`) then `_state = "survey-1"`. X/outside-close → `_dismiss()` |
| `survey-1..4` | Wizard pages with progress dots — P1: Q1–Q3 · P2: Q4–Q6 · P3: Q7–Q8 · P4: QB1–QB5. Inputs: `Skeletons.Textarea` (open text), radio rows (single choice — QB1's "dropdown" also renders as a radio list), checkbox rows (Q7 multi-select), conditional follow-up text under Q2 driven by its selection. **Only Q4 (Sean Ellis) is required**; everything else may stay blank. Answers accumulate on the instance (`this._answers`), surviving re-renders | `[Back]`/`[Next]`; last page `[Gửi]` → `survey.submit { score, answers }` → `thanks`. Closing mid-wizard just closes — the score was already saved and `done` is already set, so no dismiss/snooze call (the popup never returns either way) |
| `thanks` | Success icon + thank-you | `[Close]` → `parent.clear()` |

`_dismiss()` → `postService(SERVICE.survey.dismiss)` (server sets `snooze_until = now + 7d`)
then close. Submitting sets the server-side `done` flag — after that, `get_state` gates the
popup off forever on every device.

**Skin:** copy the `migrate-gdrive-popup` SCSS shell (`&__ui`: fixed + translate centering,
`width min(480px, calc(100vw - 32px))`, `max-height calc(100vh - 48px)` + scroll,
`var(--normal-bg-90)`, `var(--corner-radius-4)`, z-index 99998, small
`html[data-theme="dark"]` shadow block). Buttons: `__primary-btn`/`__cancel` pattern.
Star/option selected states reuse the `[data-state=1]` accent pattern. All colors/spacing
via theme tokens (`--normal-*`, `--spacer-*`) — no hex/px literals. Exact pixel details
reconciled against the three Figma frames during implementation (Figma MCP re-auth needed).

### 3 · Backend (server-team + schemas)

**server-team** — new `service/private/survey.js` (`Entity` subclass, modeled on
`google_drive.js`/`support.js`) with three methods:

- `get_state()` → `{ done, snooze_until }` — reads the drumate `profile` JSON
  (`survey: { done, snooze_until }`) + existence of a `survey_response` row.
- `submit()` — `score = this.input.need("score")` (int 1–5), `answers = this.input.use("answers", null)`
  (JSON: `{ q1..q8, qb1..qb5 }`) → `yp.await_proc("survey_upsert", uid, score, answersJson)`.
  Sets profile `survey.done = 1` via the **raw `UPDATE drumate SET profile=? WHERE id=?`**
  pattern (like `google_drive.ack_result`) — the `drumate_update_profile` proc whitelists
  keys and would silently drop a new one.
  Called twice per user at most (score-only, then score+answers) → **upsert by uid**.
- `dismiss()` — sets profile `survey.snooze_until = UNIX_TIMESTAMP() + 7*86400` (same raw-UPDATE pattern).

New `acl/survey.json` (copy `acl/google_drive.json` shape): `scope: "hub"`,
`permission: { src: "owner" }`, typed params (`score` integer required on submit).
**This file is what makes `SERVICE.survey.*` exist in the UI** — nothing to add in
ui-team's `lex/services.json`.

**schemas** (strict layout: `yellow_page/{tables,procedures}/`, one routine per file,
**must be added to `patches/manifest.txt`**):

- `yellow_page/tables/survey_response.sql` —
  `id` PK AI, `uid` varchar(16) **UNIQUE**, `score` tinyint unsigned, `answers` mediumtext
  (JSON), `ctime`/`mtime` int unsigned. UNIQUE(uid) = hard one-response-per-user;
  resubmits update the row.
- `yellow_page/procedures/survey/survey_upsert.sql` — `INSERT … ON DUPLICATE KEY UPDATE
  score, answers (only when non-empty), mtime`.
- Gotcha honored: numeric proc params never receive `null` (strict-mode INT rejects `''`) —
  pass `0`/empty-string-for-text explicitly.

## Locale

All user-visible strings in `locale/en.json`, UPPERCASE, used as `LOCALE.KEY || "fallback"`:
`RATING_SURVEY_TITLE`, `RATING_SURVEY_MSG_1..5`, `RATING_SURVEY_TAKE`,
`RATING_SURVEY_LATER`, `RATING_SURVEY_SUBMIT`, `RATING_SURVEY_THANKS`,
`PMF_Q1_LABEL…PMF_QB5_LABEL` + option strings (verbatim from `Drumee_PMF_Program.md`).
Only en.json is required (established convention); other locales can mirror later.

## Deploy order (hard requirement)

1. **schemas** — patch table + proc (`patches/manifest.txt` + `sudo bin/patch-from-file … drumate`).
2. **server-team** — `survey.js` + `acl/survey.json`, restart endpoint/service
   (ACL is what creates `SERVICE.survey.*`; UI deployed first would call `undefined`).
3. **ui-team** — widget + timer + locale, build + `pm2 restart vudangnt` (bundle-manifest cache).

## Testing

No test runner exists. Verification:

- `node --check` on all touched files; full webpack build to `/tmp` (established env vars).
- Playwright on staging: seed `localStorage['drumee-usage-seconds'] = 1795`, reload desk,
  wait ≤10s → popup appears; walk rating → wizard → thanks; verify `survey_response` row
  via SSH SQL; reload → popup never returns (`done`); separately test "Để sau" →
  `snooze_until` set and popup suppressed.
- Force-launch escape hatch for manual QA: `Wm.launch({kind:"rating_survey_popup", wm_unique_id:"rating_survey_popup"}, {explicit:1, singleton:1})` from the console.

## Out of scope

- Admin UI for reading responses (data is SQL-queryable; a `survey.list` +
  admin-console view can come later).
- Email alerts on new responses.
- Re-surveying per app version; localization of survey copy beyond en.
- Editing a submitted response from the UI.

## Addendum (2026-07-02): Google Sheet broadcast

On every `survey.submit`, the server broadcasts the (upserted) response row to
the team's PMF Google Sheet
(`1_y0RZf2O3MzOwpMHjU9bpEeO-RL36KHM9SwUeL-16fQ`, tab gid=0) through a **Google
Apps Script Web-App webhook** bound to the sheet (owner-approved choice over a
service-account share). One row per user, upserted by UID — a score-only
submit writes a partial row that the later full submit updates in place.
Choice indexes are resolved server-side to the verbatim PMF-doc English labels
(`service/lib/survey_sheet.js`); Q7 joins with `"; "`. Fire-and-forget with a
10s timeout: webhook/config absence degrades to a warn and never fails or
slows the user's submit. Config: `/etc/drumee/credential/google/survey-webhook.json`
`{ url, secret }`. Setup + ready-to-paste script:
server-team `docs/survey-sheet-webhook.md`.
