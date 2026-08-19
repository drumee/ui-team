# Contextual Sub-Tours Implementation Plan

**Goal:** Split the single 6-step `desk_tutorial` into independent sub-tours, each fired by the user's first real interaction with the matching surface, suppressed once-per-user-ever by a server-side seen-set.

**Architecture:** One `desk_tutorial` kind parameterised by a `tour` attribute; a declarative tour registry (`tutorial/tours.js`) replaces the inline `_widgets` table; a new `libs/tutorial-tours.js` owns the seen-set, the single-flight guard, the kill switch and one `RADIO_BROADCAST` channel that every trigger site raises and `desk_module` alone consumes.

**Tech stack:** ui-core "letc" widgets, `RADIO_BROADCAST`, `Visitor.settings()`, MariaDB `JSON_MERGE_PATCH` in `yellow_page`.

---

## Changelog — revision 2 (2026-08-18)

| Section | Change | Driver |
|---|---|---|
| §1 Findings | Added six verified facts (overlay-destroy bypass, no close affordance, local-only `onboarded` write, `tab-task` trigger, platform-flag precedent) and **⚠ Correction 4** | R2, R4, R6, OQ3, OQ4 |
| §1 ⚠ Correction 4 | **NEW** — the sidebar workspace-open site is `workspace-list/index.js:159/:179`, not `sidebar.js:349` (which is `new-workspace`) | OQ3 (citation was wrong) |
| §2 D3 | Now states the post-onboarding path's rule explicitly: it consults the seen-set | R4 |
| §2 D4 | Rewritten — `fire()` no longer marks; `markSeen()` does, on mount. Absorbs OQ1 (onboarding-skip marks `workspace` seen) | R1, R2, OQ1 |
| §2 D5 | Added the `task` tour's prefetch site | R6 |
| §2 D11 | **NEW** — `folder_task` split into `folder` + `task`, with `tab-task` as the task trigger | R6 |
| §3 Registry | Five flagged tours (`workspace`, `folder`, `task`, `share`, `migrate`); `full` unchanged | R6 |
| §3 Event contract | Five-step `fire()` rewritten: in-flight guard only, with a clear-on-destroy **and** timeout; `markSeen()` documented separately | R1 |
| §3 `_showTutorial` | Post-onboarding path routes through the seen-set | R4 |
| §4 S1 | Allow-list is now `workspace, folder, task, share, migrate` | R6 |
| §4 S6 | Rewritten — catch-up moved to a once-per-session prune; the old "opportunistic retry on next `fire()`" was unreachable | R5 |
| §4 S7 | Rewritten — `full` completion writes every flagged tour through `markSeen()`; absent-map inference kept for pre-existing users only | R3 |
| §4 S9 | Rewritten as a deliberate privacy decision on `"log": true`, including the do-nothing alternative | OQ5 |
| §5 C1 | Members listed with separate lifetimes (guard vs seen-set) | R1, R5 |
| §5 C4 | `markSeen()` call site; `full` writes every flag; onboarding-skip marking | R1, R3, OQ1 |
| §5 C8 | Gains the two sidebar sites | OQ3 |
| §5 C15 | **NEW** — `tab-task` trigger row | R6 |
| §5 X3 | **NEW** follow-up — callout copy localisation | OQ2 |
| §6 Phasing | Mark-on-mount moved into Phase 1; `task` moved to Phase 2; Phase 4 is the skip `×` only, with a corrected justification | R1, R2, R6 |
| §7 Risks | Mark-on-mount row corrected; guard-wedge row added; R6 pairing row added | R1, R2, R6 |
| §8 Tests | Added 41–46 | R1–R6, OQ3 |
| §9 Open questions | Reduced to one (the ops sign-off), sharpened to be actionable | OQ1–OQ3, OQ5 resolved into their sections |

## Changelog — revision 3 (2026-08-18)

| Section | Change | Driver |
|---|---|---|
| §1 Findings | Added four verified facts: zero `@media` rules in the tutorial module, the fixed 231px/100vh layout, `_placeMenu`'s target is the tutorial's **own** fake topbar (correcting revision 2's D9 rationale), and `getServices()` ships names only | R9, M2 |
| §2 D2 | Registry gains a `badge` field (`screens` \| `steps`); rejected option recorded | R10 |
| §2 D9 | Rewritten — one wrong sub-claim corrected; the post-onboarding mobile consequence is now an explicit decision with its rejected alternative | R9 |
| §3 Event contract | `_inFlight` clear is assigned an owner; the guard timer is cancelled **on mount**, not left to expire mid-tour | R8 |
| §3 Badge derivation | Rewritten for the three badge modes; single-step tours count screens | R10 |
| §4 S2 | Notes the three-site allow-list and that no sharing mechanism exists | M2 |
| §4 S4 | Rewritten as a three-state rule — an absent `tutorials_seen` is a **new user**, not a failure | R7 |
| §4 S6 | `reconcile()` is lazy-only; the module-init path is dropped | M1 |
| §5 C1 | `isSeen()` three-state rule; lazy `reconcile()`; timer cancel API | R7, R8, M1 |
| §5 C2 | `badge` field per entry; allow-list cross-reference comment | R10, M2 |
| §5 C4 | Cancels the guard timer on mount; passes the badge mode | R8, R10 |
| §5 C7 | Clears `_inFlight` on the tutorial's `destroy`, for **every** tour | R8 |
| §5 (server) | Cross-reference comments at the two server allow-list sites | M2 |
| §7 Risks | Guard-wedge row rewritten for the corrected lifecycle | R8 |
| §8 Tests | 43 split into two halves; added 47–50 | R7, R8, R9, R10 |

---

## Changelog — revision 4 (2026-08-18) — after Phase 1 shipped

Phase 1 is built and committed (unmerged, and its manual click-through is still
an open human gate). These edits fold back what building it taught.

| Section | Change | Driver |
|---|---|---|
| §2 D10, §9 | `Platform.contextual_tours` -> `Platform.get("contextual_tours")` | drift D3 |
| §2 D10, §4 S7 | `markSeen()` returns early when the kill switch is off, so "full writes every flagged tour" holds only while the feature is on | Phase 1 impl |
| §4 S1 | The `JSON_OBJECT` / `DECLARE`d-variable trap, promoted to the schema section | Phase 1 impl |
| §4 S2 | Drops "bind it in the constructor" (there is none); names the real exception calls | drift D1, D2 |
| §4 S9 | Phase 1 shipped `"log": false` — note confirmed in place | as instructed |
| §7 | Drops the `_startProductTour` guard mitigation as unnecessary, and says why | drift D4 |
| §10 | **NEW** — three defects the Phase 1 tests caught, two of them design-adjacent | Phase 1 impl |

---

## Changelog — revision 5 (2026-08-18) — Phase 3

| Section | Change | Driver |
|---|---|---|
| §3 | **NEW** — `fire()`'s return contract, and the rule that the 20s net is armed only for a tutorial that was actually launched | Phase 3 |
| §7 | Risk row for the gated-post-signup delay | Phase 3 |

---

## Changelog — revision 6 (2026-08-18) — Phase 4

| Section | Change | Driver |
|---|---|---|
| §2 D4 | Skip's semantics corrected: it is a **distinct exit**, not `_enterWorkspace()`. Adds the `end-tour` routing rule and the Escape decision | Phase 4 |
| §3 | `end-tour` added to the event contract — routed at the host, not the step | Phase 4 |
| §5 C13 | `SKIP_TOUR` already existed in all six locales; no work needed | Phase 4 |
| §7 | Risk row for skip being re-pointed at the Done path | Phase 4 |

**A-1 (spotlight pointer-events) is NOT resolved** and no §7 note was added. See
§9 — it could not be settled from source, and the runbook now determines it
in situ (item A11a).

---

## Changelog — revision 7 (2026-08-18) — Phase 5a

| Section | Change | Driver |
|---|---|---|
| §5 C11/C12 | `tutorial_settings` deleted; string sweep recorded | Phase 5a |
| §5 C5 | Complete — every step badge is derived; the guard is inverted and permanent | Phase 5a |
| §6 Phase 5 | **Split into 5a (cleanup, built) and 5b (rollout, procedure only)** | Phase 5a |
| §9 OQ6 | Narrowed — four hypotheses ruled out statically; the finding is now stronger than "undetermined" | Phase 5 follow-up A-1 |
| §2 D4 | Escape's binding lifetime confirmed and the shadowing survey recorded | Phase 5 follow-up A-2 |

---

## Changelog — revision 8 (2026-08-18)

| Section | Change | Driver |
|---|---|---|
| §9 OQ6 | Fifth hypothesis (media query / viewport-conditional rule) **ruled out**, in source and in compiled output, and re-measured at two viewports | Follow-up A |
| §9 OQ7 | **NEW** — who gets interrupted when the flag flips. A product decision, not a rollout detail | Rollout review |

---

## Changelog — revision 9 (2026-08-18)

| Section | Change | Driver |
|---|---|---|
| §1 | **Citation convention** stated, and applied across the document: 64 distinct citation forms for modified files converted from `path:line` to `path` + symbol | Closing pass |
| — | No behavioural claim changed. Statements found to have drifted are listed for decision in `…-phases.md`, not edited in place | Closing pass |

---

## 1. Findings

> **Citation convention** (applied once, revision 9, against the `phase5a` head).
> A file **this work modified** is cited by `path` plus a **symbol or case name**
> — `modules/desk/index.js` `_launchHomeTutorial`, `case "overlay"` — never by
> line, because those lines have already moved ~100 times across five phases and
> will keep moving. A file **this work did not touch** keeps its `path:line`,
> which is still accurate and more precise. Where a bare `index.js` was
> ambiguous it has been expanded to a full path; `builtins/window/folder/index.js`
> (the folder window) and `…/tutorial/folder/index.js` (the tour step) are
> different files and are now always distinguishable.

Everything below was re-read in this repo. **Corrections to the brief are marked ⚠.**

### Confirmed as stated

| Claim | Verified at |
|---|---|
| All entry points converge on `_showTutorial()` | `modules/desk/index.js` `_showTutorial` |
| `desk_tutorial` → lazy chunk | `src/drumee/seeds.js` (the `desk_tutorial` entry) |
| Post-signup arming | `modules/desk/index.js` `_loadOnboarding` inside `_loadOnboarding()` at `:1868` |
| `?tutorial=1` + flag branch | `modules/desk/index.js` `onPartReady` / `case "overlay"` |
| Get help raises `start-product-tour` | `builtins/widget/help/main/index.js:343` → desk `onUiEvent` `modules/desk/index.js` `case "start-product-tour"` → `_startProductTour()` `:1929` |
| `onPartReady("desk-tutorial")` chains | `modules/desk/index.js` `onPartReady` / `case "desk-tutorial"`, `_chainRewardFlowAfterTutorial` `:2533`, `_chainHelpReturnAfterTutorial` `:1969` |
| Fake-desk skeleton, `sys_pn: _a.content` step slot | `modules/desk/tutorial/skeleton/index.js:1-23` |
| `_preloadSteps()` warms 5 kinds | `modules/desk/tutorial/index.js` `_preloadSteps` |
| `_widgets` step table, array-with-backdrop shape | `modules/desk/tutorial/index.js` `_buildWidgets` |
| `enter_at_last` merged onto the **last** array entry | `modules/desk/tutorial/index.js` `_widgetAt` (`_widgetAt`), consumed `_prevStep` `:131` |
| `tutorial_folder` doubles as inert backdrop | `…/tutorial/folder/index.js` `onDomRefresh` (inert-backdrop check) |
| Spotlight forwarding + `waitForStableRect` | `modules/desk/tutorial/spotlight/index.js` `waitForStableRect`, `focus()` `:96` |
| Measured radii / menu placement | `…/tutorial/task/index.js` `_holeRadius` `_holeRadius`, `…/tutorial/share/index.js` `_holeRadius` `_holeRadius` + `_scrollPanelTo` `:96`, `…/tutorial/migrate/index.js` `_placeMenu` `_placeMenu` |
| `_enterWorkspace()` exit | `modules/desk/tutorial/index.js` `_enterWorkspace` |
| `tutorial_done` is write-only | Only occurrence in `ui-team`, `server-team`, `signup`, `onboarding-ui`, `schemas` is the write at `modules/desk/tutorial/index.js` `_enterWorkspace` |
| Trigger sites (topbar, icons-list, sections, share A, share B) | as documented; `builtins/window/utils.js:30` `SECTION_CLASSES`, `:725-761` `_doPartition`, `builtins/window/folder/index.js` `case "folder-manage-access"` + `:5072`, `builtins/media/interact.js` `case 'secure-share'` |
| Duplicated share gate | `folder/skeleton/topbar.js:71-95` vs `window/skeleton/toolkit/index.js:1659-1672` |

### ⚠ Correction 1 — `desk-module-topbar__new-workspace-btn` exists, but it is **not** a workspace button

`modules/desk/skeleton/topbar.js:146-150`:

```js
trigger: Skeletons.Button.Label({
  ico: "topbar-add",
  className: `${pfx}__new-workspace-btn`,   // → desk-module-topbar__new-workspace-btn
  label: LOCALE.NEW || "New",
}),
```

It is the **`trigger` of the `Skeletons.Menu`** declared at `topbar.js:134-141` (`sys_pn: "addmenu"`, `partHandler: [ui]`). It carries **no `service`**, so `desk_module.onUiEvent` never sees it — D6's "hook it by service name" is not available. Its label is `LOCALE.NEW` ("New"), not "New workspace"; the class name is historical.

The actual `new-workspace` service lives on a submenu row two levels down (`topbar.js:70-75`, inside `createGroup` at `:107`) and is *also* raised by the sidebar (`modules/desk/skeleton/sidebar.js:349`) and the desk-background context menu (`modules/desk/wm/index.js` `case "new-workspace"` → `modules/desk/index.js` `case "new-workspace"`).

Resolved in **D6**.

### ⚠ Correction 2 — `SERVICE.drumate.update_settings` merges, but unsafely

`server-team/service/private/drumate.js` `update_settings`:

```js
const settings = this.input.need(Attr.settings);
let old_settings = this.user.get(Attr.settings) || {};
const settings_str = JSON.stringify({ ...old_settings, ...settings });
await this.yp.await_proc('entity_update_settings', this.uid, settings_str);
```

- The merge is **top-level shallow only**. Posting `{tutorials_seen: {share: t}}` **replaces** the whole `tutorials_seen` sub-object.
- `old_settings` comes from `this.user` — the **session snapshot loaded at request start**, not a fresh read. Two tabs → classic lost update even for flat keys.
- The proc is a blind whole-column overwrite: `schemas/yellow_page/procedures/entity/entity_update_settings.sql` is `UPDATE entity SET settings=_data WHERE id=_id`.

So `update_settings` **cannot** carry the seen-set. This decides **S2** outright: a dedicated, atomic endpoint is required.

### ⚠ Correction 3 — the read path is already free

`schemas/yellow_page/procedures/directory/get_user.sql` selects `settings` (alongside `profile`). `drumee.js:47` does `xhRequest('yp.get_env')` → `:155 Visitor.set(user)`, and ui-core exposes `Visitor.settings()` (`node_modules/@drumee/ui-core/letc/user.js:359-368`, already used at `builtins/widget/settings/main/index.js:258`).

**The seen-set arrives in the bootstrap payload, before the desk module renders, therefore before any click is possible.** No new read request, no blocking, no race. This substantially simplifies **S4**.

### ⚠ Correction 4 — the sidebar workspace-open site is not `sidebar.js:349`

OQ3 cites `modules/desk/skeleton/sidebar.js:349` as the sidebar's workspace-open trigger. It is not: that line is the `service` argument of the mobile "Add new" nav item, i.e. **`new-workspace`** (`sidebar.js:345-353`) — a *creation* affordance, and already covered by the `migrate` trigger's sibling service.

The real sidebar sites are in the workspace-list widget:

- `modules/desk/workspace-list/index.js` `case "load-workspace"` case `"load-workspace"` → `Wm.loadWorkspace(target)` at `:173`
- `modules/desk/workspace-list/index.js` `case "load-folder"` case `"load-folder"` → `Wm.openWorkspaceFolder(trigger)` at `:180`

Both are consumed in **OQ3 / C8** in place of the cited line.

### Other verified facts

- **`entity.settings` is `mediumtext NOT NULL`**, with a FULLTEXT key (`schemas/yellow_page/tables/entity.sql:27`, `:41`) — not a native JSON column, so any merge SQL must guard with `JSON_VALID`.
- `JSON_MERGE_PATCH` is already used in this schema set (`hub/procedures/admin/folder_save_permissions.sql`, `yellow_page/procedures/conference/conference_update.sql`, …) — available, no version risk.
- **No settings key whitelist.** `acl/drumate.json` (the `update_settings` entry) declares `settings` as `{type: "object", required: true}`; unknown keys pass through untouched.
- **No existing per-user "first seen / first used" service** anywhere in `acl/*.json`. Nothing to join.
- `SERVICE` is `_.merge({}, require('lex/services'), Platform.get('services'))` (`.claude/rules/api-services.md`), so a new ACL entry surfaces automatically as `SERVICE.drumate.<name>`; `lex/services.json` needs no edit. The defensive-literal idiom is `(SERVICE.drumate && SERVICE.drumate.tutorial_seen) || 'drumate.tutorial_seen'` (precedent `builtins/player/document/index.js:38`).
- `Skeletons.Menu` fires `this.trigger(_e.open)` **only** on open (`node_modules/@drumee/ui-core/letc/widgets/menu/index.js:361`, inside `_openItems()`); `_closeItems()` does not. A clean "user opened + New" signal.
- `RADIO_BROADCAST` is the established cross-tree transport: desk already binds a dozen channels (`modules/desk/index.js` `initialize`), and `libs/over-limit.js:106` is the precedent for a lib module owning a channel constant plus cached state.
- **15 hardcoded `badge_text:` sites** across 7 files (workspace 3, folder 3, share 3, migrate 3, meeting 1, task 1, settings 1 — retired).
- Badge `title`/`desc` strings are **raw English literals**, not `LOCALE.*` — a standing violation of `.claude/rules/framework-invariants.md` §5. Scoped out as follow-up **X3**.
- `LOCALE.BACK` / `NEXT` / `DONE` exist (`locale/en.json:29, 815, 97`); there is **no** `TUTORIAL_STEP` key.
- `Visitor.profile().devel` is the established dev gate (`builtins/media/core.js:339`, the `execute` context-menu item).

### Verified for this revision

- **Destroying the overlay does bypass `_enterWorkspace()`.** `_enterWorkspace()` is called from exactly one place — `_nextStep()` at `modules/desk/tutorial/index.js` `_nextStep`, when the step index runs off the end of `_widgets`. The desk's `overlay` part is `Skeletons.Wrapper.Y` (`modules/desk/skeleton/index.js:190-197`) and is fed by three separate paths: `_showTutorial` (`modules/desk/index.js` `_showTutorial`), the reward flow (`:2077`) and the generic `loadOverlay(kind, opt)` (`:2661`). Each calls `p.feed(...)`, which replaces the wrapper's children and destroys a running tutorial **with no flag written**. Confirms R2's premise.
- **There is no close affordance on the callout.** `tooltipBadge`'s card has exactly four children — badge, title, desc, footer{Back, Next} (`modules/desk/tutorial/skeleton/toolkit/tooltip.js` `tooltipBadge` (the card)). No `×`, no Esc handler, no outside-click dismiss.
- **The `_reset()` branch writes `onboarded` locally only.** `onboarding-ui/app/main.js:930-934` returns immediately after `triggerHandlers()` when `type == 'app'`, *before* `SERVICE.onboarding.reset` is called; desk case `"onboarding-completed"` (`modules/desk/index.js` `case "onboarding-completed"`) mutates `Visitor.profile().onboarded = 1` in memory and calls `loadDefault()` — no server write. So the wizard can legitimately reappear on the next session. Confirms R4's premise.
- **An honest task-shaped trigger exists.** `builtins/window/folder/index.js` `case "tab-task"` case `"tab-task"` → `showFolderTab(_a.task)`, raised by the two Tasks tab-bar entries at `builtins/window/skeleton/toolkit/index.js:234` and `:242`. It is the exact surface `tutorial_task` mocks — `task/skeleton/index.js:99-120` builds folder chrome + a tab bar with `active: 'tasks'` + the five-view switcher. Used by **D11**.
- **Platform rollout-flag precedent.** `server-team/service/lib/env.js` (the `over_limit_enforcement` line) — `platform.over_limit_enforcement = global.myDrumee.over_limit_enforcement ? 1 : 0;` — is the coerced on/off shape D10 copies, keyed from `/etc/drumee/conf.d/myDrumee.json`.

### Verified for revision 3

- **The tutorial module has no responsive rules at all.** `grep -c '@media'` across `modules/desk/tutorial/skin/*.scss` and `modules/desk/tutorial/*/skin/*.scss` returns **0**, and there is no `data-device` branch anywhere under `modules/desk/tutorial/`. The layout is fixed desktop geometry: `tutorial/skin/index.scss:50-53` sets `__sb-main { width: 231px; height: 100vh }`, `meeting/skin/index.scss:23` caps the room at `max-width: 1242px` with a `min-width: 415px` chat rail at `:335`, and `folder/skin/index.scss:21` sets `max-width: 850px`. On a phone viewport the tour renders a 231px fixed sidebar plus desktop-width panels with no reflow. Used by **D9**.
- **⚠ Revision 2's D9 rationale was wrong on one point.** It claimed `migrate/index.js:88 _placeMenu()` "measures `.tutorial-main__tb-new-workspace-btn`, which is not rendered on mobile". It is: the selector at `…/tutorial/migrate/index.js` `_placeMenu` targets the **tutorial's own fake topbar** (`tutorial/skeleton/topbar.js:39`, prefix `${fig}__tb` where `fig` is `tutorial-main`), which is always rendered regardless of device — not the desk topbar that mobile hides. The claim is struck; D9's conclusion stands on the responsive-rules evidence above.
- **No mechanism exists for sharing a constant between `ui-team` and `server-team`.** `getServices()` (`server-team/router/rest/index.js:474-488`) flattens each ACL module to `{ns: {method: "ns.method"}}` — **names only**. Params, enums and doc strings are dropped before `platform.services` is built (`service/lib/env.js` (`platform.services`)), so the ACL cannot carry the tour allow-list to the client. Used by **M2**.

---

## 2. Design decisions

**D1 — Keep the fake skeleton (option a).**
Rejected: real DOM. It would require rewriting every `target`/`anchor` `sys_pn` into live selectors, plus `…/tutorial/task/index.js` `_holeRadius` `_holeRadius`, `…/tutorial/share/index.js` `_holeRadius` `_holeRadius`, `…/tutorial/share/index.js` `_scrollPanelTo` `_scrollPanelTo` and `…/tutorial/migrate/index.js` `_placeMenu` `_placeMenu` against scrollable, async, partition-mutated layout (`utils.js:496` re-appends tiles under an active `MutationObserver`) — with `waitForStableRect` becoming load-bearing on every screen instead of a safety net. That is a rewrite of the whole tutorial, not a split.
**Consequence to state plainly:** the user sees a *mock* desk with mock workspaces and mock files, over their real one. Their real action has already run underneath (see Hard requirement 1), so when the overlay clears the workspace/drawer/menu they opened is there. Each sub-tour's first screen is chosen to match what they just did, so the mock reads as an illustration of the thing in front of them.

**D2 — One kind, declarative registry.**
`modules/desk/tutorial/tours.js` exports `TOURS`, keyed by tour id. `desk_tutorial` stays a single kind (`seeds.js` (the `desk_tutorial` entry)); the tour is a **model attribute**: `p.feed({kind:"desk_tutorial", tour: tourId, sys_pn:"desk-tutorial", partHandler:this})`. `tutorial_main.initialize` reads `this.mget('tour')` and builds `_widgets` from the registry instead of literals.

```js
// tours.js — shape (illustrative)
folder: {
  id: 'folder', flag: 'folder',
  badge: 'screens',                 // count screens, not steps — see D2 badge modes
  steps: [ { kind: 'tutorial_folder', screens: 3, backdrop: ['workspaceFaded'] } ],
},
```

`screens` drives the `done` flag (last screen of last step); `backdrop` names composer functions in `skeleton/toolkit/backdrops.js` so composition is data, not code.
Rejected: per-tour kinds (`tutorial_tour_share`, …) — extra `seeds.js` entries, extra chunks, and `Kind.waitFor` prefetch would have to warm a wrapper before it could warm the steps.

**Badge mode is declared, not inferred** (was R10). Deriving the badge from `tour.steps.length` alone worked for the 6-step monolith, but after D11 every flagged tour has exactly one step — so `migrate` would read "STEP 1/1" on all three of its screens, `share` "STEP 1/1" on all three, and so on. That is worse than the hardcoded `STEP 6/6` strings C5 deletes, and C5 is the point of no return, so the mode is an explicit registry field:

| `badge` | Denominator | Used by |
|---|---|---|
| `'screens'` | the step's own `screens` count | every single-step flagged tour (`workspace`, `folder`, `task`, `share`, `migrate`) |
| `'steps'` | `tour.steps.length` | `full`, `meeting` |

For a **multi-step flagged tour** — none exists today, but the registry allows one — `badge: 'steps'` numbers the step within the tour (`STEP 2/2`), and `badge: 'screens'` is rejected at registry-read time with a warning rather than silently numbering screen 4 of step 2 as "4/5". Stating this now means whoever adds the next tour does not have to guess.

Rejected: inferring the mode (`steps.length === 1 ? 'screens' : 'steps'`). It produces the right answer for every tour that exists today and the wrong one the moment someone adds a two-step contextual tour, with no error — exactly the silent-failure class this field exists to remove.

**D3 — Persistence, and who consults it.**
Server-side seen-set in `entity.settings.tutorials_seen`, a dedicated atomic write endpoint, read for free at bootstrap, `localStorage` mirror as a same-device latency cover only (§4).

**The post-onboarding `workspace` tour consults the seen-set like any other trigger.** The overlay branch (`modules/desk/index.js` `onPartReady` / `case "overlay"`) does not call `_showTutorial('workspace')` directly; it calls `Tours.fire('workspace')` and lets the same gate decide.
Rejected: exempting it like `full`. The wizard genuinely can reappear — `_reset()` returns before `onboarding.reset` (`onboarding-ui/app/main.js:930-934`) and desk's `"onboarding-completed"` handler writes `onboarded` in memory only (`modules/desk/index.js` `case "onboarding-completed"`) — so an exemption means a repeated wizard produces a repeated tour. The `IS NULL` predicate already makes the duplicate *write* harmless, so this is about the user's screen, not data integrity.
`?tutorial=<id>` and Get help → Product Tour stay exempt (they are explicit requests).

**D4 — Mark on mount, via `markSeen()`, never in `fire()`.**
The tour id is recorded when `tutorial_main` mounts with that tour — in its `onDomRefresh`, alongside the existing `feed(skeleton)` — not when the trigger fires and not on Done.
Rejected: mark on Done (today's rule at `modules/desk/tutorial/index.js` `_enterWorkspace`). With no skip control (verified above) and `_enterWorkspace()` reachable only by completing every screen, a reload or an overlay re-feed mid-tour leaves nothing written, and the next qualifying click replays the whole thing — indefinitely.
Rejected: mark on fire. A tour whose chunk fails to load would be marked seen and never shown. **This is why `fire()` must not touch the seen-set** — see §3's event contract, which keeps the single-flight guard and the seen-set as separate members with separate lifetimes.
Cost: a user who reloads during the tour never sees the rest of it. Accepted; re-interrupting is worse.

**Skip is a distinct exit, and writes nothing.** An earlier draft of D4 said it
"exits via the same `_enterWorkspace()` path". That is wrong, and the reason is
worth keeping: `_enterWorkspace()` is the **Done** path and does two things skip
must not.

| | Why skip must not do it |
|---|---|
| writes `tutorial_done: true` | Recording that because someone dismissed a three-screen tour is wrong on its face — and it is load-bearing. S7 reads `tutorial_done` truthy **and** `tutorials_seen` absent as *has seen everything*. The map is never absent once a tour has mounted, so the inference does not fire today; but a QA reset (S8) clears the map, and then one skip would permanently suppress every tour. |
| marks all five flagged tours, for `full` | Skipping `full` on screen 1 would record the user as having seen every tour they just declined to watch. |

`_skipTour()` therefore calls `softDestroy()` and nothing else. It does not need
to write: the tour was recorded when it **mounted** (above), which is what stops
it re-triggering. `softDestroy()` is the same teardown Done uses, so everything
chained on `destroy` — the reward flow, LAUNCH30, the invited-workspace prompt,
the Get-help return, the single-flight release — behaves identically.

**Skipping `full` leaves the contextual tours armed.** `full` carries no flag, so
nothing is recorded, and a user who left it early has genuinely not seen them.

**`end-tour` is routed at the host, not the step.** Back and Next are wired at
the STEP widget because only the step knows whether it has another screen;
ending the tour is the tour's business. The spotlight is the one object holding
a reference to both — `owner` is the step, its own `partHandler` is
`tutorial_main` — so it passes the host into `tooltipBadge`, and the control
raises there. One case in `tutorial_main` instead of the same forwarding case in
six step files.

**Escape: implemented, at capture phase.** The desk already owns a bubble-phase
Escape (`desk-escape`) whose `match` guards on `!e.defaultPrevented`, so a
capture binding that reports it acted gets `preventDefault()` from
`libs/hotkeys` and the desk's handler then declines that keypress on its own
terms. The two interlock through the existing contract rather than racing.
**Binding lifetime** (Phase 5 follow-up A-2): registered in
`tutorial_main.onDomRefresh` and unregistered in `onBeforeDestroy` — the tour's
own mount and destroy, never module load and never the desk. A capture-phase
global Escape outranks everything else in the app, so it must not outlive the
thing it belongs to; a test pins both halves.

**Shadowing survey.** `libs/hotkeys` never calls `stopPropagation` (its own rule
4), so nothing is *prevented from running* — coordination is only
`preventDefault` + `defaultPrevented`. Of the app's other Escape handlers:
`desk-escape` checks `defaultPrevented` and correctly declines while a tour is
up; `window/confirm/index.js:104` answers Escape on **keyup**, a different event,
which `libs/hotkeys.js:45-46` already documents as a known and accepted split;
the rest (`meeting-desc-editor`, the player's rename and share popups, tasks,
chat) are element-level handlers on inputs inside windows that cannot be focused
while the tour's mock desk is up. Nothing is newly shadowed by this binding.

Rejected: leaving Escape out on the grounds that an accidental press is
permanent. It is no more permanent than an accidental reload — the tour is
recorded from mount either way — and a full-screen thing that cannot be
dismissed with Escape is a UX smell.

**Onboarding-skip marks `workspace` seen** (was OQ1). The `_reset()` → `"onboarding-completed"` path (`modules/desk/index.js` `case "onboarding-completed"`) calls `Tours.markSeen('workspace')` directly, without mounting anything. A user who dismissed the wizard has declined the guided intro; injecting a tour into a branch built deliberately to skip it would override that. It also correctly suppresses the tour when the wizard reappears next session for the local-only-`onboarded` reason above.
Cost: a skipper never sees the workspace tour at all. Accepted — it is the one tour with no contextual trigger, so "later" does not exist for it.

**D5 — Prefetch when the trigger surface renders, plus an idle sweep.**
`Kind.waitFor(kind)` for a tour's step kinds fires when its trigger surface first becomes ready — `onPartReady("addmenu")` for `migrate`, `onPartReady(_a.list)` on the WM for `folder`, `window_folder` mount for `share` **and `task`** — plus a catch-all idle sweep chained off `_afterHomeSettled()` (`modules/desk/index.js` `_afterHomeSettled`). All fire-and-forget, exactly as `_preloadSteps()` (`modules/desk/tutorial/index.js` `_preloadSteps`) does today.
If the click still beats the chunk: `desk_tutorial` mounts, the fake desk paints, the step slot holds the ui-core lazy-loader placeholder, and the spotlight stays at `state 0` (it is only raised by a step's `spotlight:focus`). The user sees the mock desk with no callout for the chunk's duration, then the callout appears. No spinner is added — the existing placeholder path already covers it. Note this is also why `markSeen()` runs on `tutorial_main`'s mount, which is reached, rather than on the step widget's.

**D6 — Trigger instrumentation.**

| Surface | Hook | Why |
|---|---|---|
| icons-list tile | `modules/desk/wm/index.js` `case "open-node"` case `"open-node"`, **after** `this.openContent(cmd, args)` is dispatched | Past the per-node 1s debounce, so a swallowed duplicate cannot fire a tour. `cmd.mget(_a.filetype) ∈ {hub, folder}` is the discriminator — never the section `<div>` (tiles are re-appended into them by `utils.js:725-761` under a live observer). Rejected: a delegated listener on the list part — it would fire on the swallowed duplicate and would need its own filetype read anyway. |
| sidebar workspace / folder row | `modules/desk/workspace-list/index.js` `case "load-workspace"` case `"load-workspace"` and `:179` case `"load-folder"` | See ⚠ Correction 4 and OQ3 below. |
| + New | `desk_module.onPartReady` new case `"addmenu"` → `child.on(_e.open, …)` (`ui-core menu/index.js:361`) | The named class has no service (⚠ Correction 1). `_e.open` fires on open only, so a close cannot re-trigger. Re-bound automatically when `_updateAddmenu()` (`modules/desk/index.js` `_updateAddmenu`) / `_onOverLimitChanged()` (`:2137`) re-feed the fragment, because the handler is bound in `onPartReady` and **all state lives in `libs/tutorial-tours.js`, none on the node or the widget**. Rejected: hooking service `new-workspace` — it is the *result* of the menu, and it fires from the sidebar (`sidebar.js:349`) and the desk context menu too, which the spec does not name. |
| Tasks tab | `builtins/window/folder/index.js` `case "tab-task"` case `"tab-task"` | New in D11. |
| Share A | `builtins/window/folder/index.js` `case "folder-manage-access"` case `"folder-manage-access"`, guarded `if (!this.isShowSettings)` **before** calling `openManageAccess()` | `openManageAccess()` (`:5072`) toggles: a second click *closes* the drawer. Reading the flag before the call is the only place the open/close distinction exists. Covers the overflow-menu path (`window/skeleton/toolkit/index.js:1667`) for free — same service, same case. |
| Share B | `builtins/media/interact.js` `case 'secure-share'` case `'secure-share'`, at the **top of the case**, before `Wm.getWindowPreset` | The `once()` latch races wrapper-resolved / rejected / 600ms timeout; firing at the top means the tour runs regardless of which path wins, including the floating-window fallback. |

All of them raise the same channel; none awaits anything or returns early.

**Two triggers, one tour** (was OQ3). The `folder` tour is about folders, not about how the user reached one, and a sidebar-first user would otherwise never see it. Single-flight plus the seen-set make a double fire harmless. The sidebar is an **addition, not a move**: `loadWorkspace` alone is insufficient because folder tiles open a folder *window* rather than a workspace, so the `open-node` hook stays. Note the sites are in `workspace-list/index.js`, not `sidebar.js` (⚠ Correction 4).

**D7 — `meeting` confirmed untouched.** No contextual trigger, no flag, module unchanged. It remains reachable only through the `full` tour. **Therefore the `full` tour is permanent and must not sit behind the kill switch** — if `full` were removable, `tutorial_meeting` would become dead code.

**D8 — Any `secure-share` click qualifies.** Rejected: restricting to `.group-section[data-group="doc"]`. `setGrouped` is only ever called by the folder window (`builtins/window/folder/index.js` `initialize` (`setGrouped`), `:1377`), so the narrow rule means a user in flat or list view never sees the share tour, and the two share entry points — which share one flag — would behave inconsistently. The DOM section is also the wrong identity anyway (same reason as the icons list).

**D9 — No tours on mobile at all — contextual *or* post-onboarding; flags are NOT set there.**

Gate on `Visitor.isMobile()` in `libs/tutorial-tours.js`, inside `fire()`.

**Evidence.** The tutorial module carries **zero `@media` rules and no `data-device` branch** (verified, §1 revision 3). Its layout is fixed desktop geometry — `tutorial/skin/index.scss:50-53` `__sb-main { width: 231px; height: 100vh }`, `meeting/skin/index.scss:23` `max-width: 1242px` with a `min-width: 415px` rail at `:335`, `folder/skin/index.scss:21` `max-width: 850px`. On a phone the tour renders a 231px fixed sidebar and desktop-width panels with no reflow.

*(Revision 2 also cited `_placeMenu()` measuring a button mobile never renders. That was wrong — the selector at `…/tutorial/migrate/index.js` `_placeMenu` targets the tutorial's **own** fake topbar, `tutorial/skeleton/topbar.js:39`, which always renders. The claim is withdrawn; the conclusion does not depend on it.)*

Not setting the flags means a mobile-first user still gets each tour on their first desktop session. Cost: a mobile-only user never sees any contextual tour.

**Consequence for the post-onboarding tour, decided explicitly** (was R9). Because D3 routes the overlay branch through `Tours.fire('workspace')`, the mobile gate now applies to it too — so a mobile signup gets **no** tour where today it gets `full`. That is a real behaviour change and is adopted deliberately, not inherited: what today's mobile signup receives is the same unreflowed desktop layout described above, so the change removes a broken experience rather than a working one.

Rejected: exempting the post-onboarding path with `fire(tourId, {ignoreMobile: true})` or a direct `_showTutorial('workspace')` that still consults `isSeen()`. It would preserve today's behaviour byte-for-byte, which is its only merit; it also preserves shipping a 231px-sidebar tour to phone signups, and it creates a second, differently-gated entry path through code whose whole point is that one function decides. If mobile ever gets a responsive tutorial skin, the exemption is a one-line addition at that time — the flag-not-written rule (above) means those users will still be eligible.

Tablet (768–1024px) **does** run them: `Visitor.isMobile()` excludes it, the desktop topbar is present, `Skeletons.Menu` (`topbar.js:308-345`) only replaces the *cluster*, and `addmenu` still exists.

**D10 — Kill switch: `Platform.get("contextual_tours")`, default off for one release.**
Read in `libs/tutorial-tours.js` (same shape as `libs/billing.js` reading `Platform.billing_upgrade`), with a `localStorage.contextualTours` dev override. When **off**: the post-onboarding branch runs `full` exactly as today, no trigger site fires, no writes happen — the old behaviour is byte-for-byte reachable. When **on**: post-onboarding runs `workspace`, contextual triggers are live.
Server side follows `over_limit_enforcement` verbatim (`server-team/service/lib/env.js` (the `over_limit_enforcement` line)). Removal of the flag is the last item of the last phase.

**"Off" includes the network.** `markSeen()` returns early when the switch is off, not just `fire()`. Without that, one path still writes with the feature disabled: the full tour's exit records every flagged tour (S7), and the full tour runs whether or not the switch is on. Five POSTs from a disabled feature is not "byte-for-byte today's behaviour".

Accepted cost: a user who completes `full` while the switch is off, and is then switched on, sees the contextual tours anyway — their completion was never recorded. Showing a three-screen tour to someone who has already seen its content once is a far smaller error than writing suppression state on behalf of a feature that was not running, which cannot be distinguished afterwards from a genuine contextual run.

**D11 — Split `folder_task` into `folder` and `task`** (was R6). **Two tours, two flags, two triggers.**

The merged tour put **8 screens** behind the desk's primary navigation gesture. Opening a workspace tile is not a considered action; it is how the product is used. Worse, the reward for navigating is a mock desk covering the real one *while* `loadWorkspace` (`modules/desk/wm/index.js` `loadWorkspace`) resets the collection, hides the list, calls `restart()` and re-partitions the grid underneath — so when the overlay clears after 8 screens the user has also lost the visual continuity of their own navigation. This is the single most likely source of complaints in the feature.

The split is honest because a matching trigger exists: `builtins/window/folder/index.js` `case "tab-task"` case `"tab-task"` → `showFolderTab(_a.task)`, raised by the Tasks tab entries at `builtins/window/skeleton/toolkit/index.js:234` and `:242`. That is precisely the surface `tutorial_task` mocks (`task/skeleton/index.js:99-120` renders folder chrome + a tab bar with `active: 'tasks'` + the five-view switcher). Clicking "Tasks" is a considered, low-frequency action on the exact thing the tour explains.

Result: `folder` = 3 screens on first workspace/folder open; `task` = 5 screens on first Tasks-tab open. Neither is 8.

Rejected: keeping them merged and shortening the copy — the screens are the design, and trimming them is a different piece of work. Rejected: firing `task` from the same `open-node` hook with a delay — a timer-based interruption is worse than a click-based one.

Cost: two `tutorials_seen` keys instead of one, and one more allow-list entry. The registry supports it at no cost (D2). It also **reduces** Phase 1: `task`'s trigger lives in `window_folder`, i.e. cross-tree, so it moves to Phase 2 with the share triggers (§6).

---

## 3. Target architecture

### New files

```
src/drumee/libs/tutorial-tours.js          NEW  seen-set, single-flight guard, kill switch, CHANNEL const
src/drumee/modules/desk/tutorial/tours.js  NEW  TOURS registry (the only place a tour is defined)
src/drumee/modules/desk/tutorial/skeleton/toolkit/backdrops.js  NEW  named backdrop composers
```

### Deleted files

```
src/drumee/modules/desk/tutorial/settings/**   (retired widget, incl. its stale "STEP 3/5")
  + its seeds.js:143 registration
```

### Part tree (unchanged in shape)

`tutorial_main` still feeds `skeleton/index.js` and still owns `sys_pn: _a.content` + `sys_pn: 'spotlight'`. The only structural change is that `_widgets` is **built from `TOURS[this.mget('tour')]`** instead of being a literal.

### Tour definition

```js
// modules/desk/tutorial/tours.js
const TOURS = {
  workspace: { id:'workspace', flag:'workspace', steps:[ {kind:'tutorial_workspace', screens:3} ] },
  folder:    { id:'folder',    flag:'folder',    steps:[ {kind:'tutorial_folder',  screens:3, backdrop:['workspaceFaded']} ] },
  task:      { id:'task',      flag:'task',      steps:[ {kind:'tutorial_task',    screens:5, backdrop:['workspaceFaded']} ] },
  share:     { id:'share',     flag:'share',     steps:[ {kind:'tutorial_share',   screens:3, backdrop:['workspaceFaded']} ] },
  migrate:   { id:'migrate',   flag:'migrate',   steps:[ {kind:'tutorial_migrate', screens:3, backdrop:['workspaceGrid']} ] },
  meeting:   { id:'meeting',   flag:null,        steps:[ {kind:'tutorial_meeting', screens:1, backdrop:['workspaceFaded']} ] },
  full:      { id:'full',      flag:null,        steps:[ /* all six, in today's order */ ] },
};
```

`flag: null` = never suppressed, never recorded (`meeting`, `full`). The five flagged ids are the wire contract (§4 S1).

**Badge derivation** (Hard requirement 3). Driven by the registry's `badge` field (D2), not by `steps.length` alone:

```js
// badge: 'steps'   → numerator = step index,   denominator = tour.steps.length
// badge: 'screens' → numerator = screen index, denominator = step.screens
badgeText(tour, s, n) // → LOCALE.TUTORIAL_STEP.format(numerator + 1, denominator)
```

The **step** numbers are passed down as a model attribute on the step widget, exactly as `enter_at_last` is today (`modules/desk/tutorial/index.js` `_widgetAt`): `badge_mode`, `screen_count`, and `badge_text` for the `'steps'` case. A `'screens'`-mode step recomputes its own `badge_text` on each screen change — it is the only object that knows `_screenIndex`, and it already re-renders the callout there (`…/tutorial/folder/index.js` `_showScreen` `_showScreen`, `…/tutorial/task/index.js` `_showScreen`, `…/tutorial/share/index.js` `_showScreen`, `…/tutorial/migrate/index.js` `_showScreen`). So the change to each step widget is one line in `_showScreen`, not a new mechanism.

Each step widget deletes its local `BADGE`/`badge_text` literals. New locale key `TUTORIAL_STEP` = `"STEP {0}/{1}"` in all six language files.

Net effect: `migrate` reads STEP 1/3 → 2/3 → 3/3 across its screens; `full` still reads STEP 1/6 → … → 6/6 across its steps, with `tutorial_meeting` at 3/6.

**Back at a tour boundary** (Hard requirement 4). `tutorial_main` passes `is_first: true` on the first step; `tooltipBadge` already supports `hide_back` (`…/toolkit/tooltip.js` `tooltipBadge` (`hide_back`), param at `:28`). Each multi-screen step passes `hide_back: this.mget('is_first') && this._screenIndex === 0` instead of today's per-step logic (only `…/tutorial/workspace/index.js` `_showBadge` has any). One rule, driven by the registry.

**Backdrops** (Hard requirement 5). `backdrops.js` exports named composers (`workspaceFaded`, `workspaceGrid`, `folderInert`, …) returning the array of inert skeleton entries; `_widgetAt` composes `[...backdrop.map(fn => fn(this)), stepWidget]`. `tutorial_folder`'s no-service inert mode (`…/tutorial/folder/index.js` `onDomRefresh` (inert-backdrop check)) becomes a named backdrop rather than an implicit second personality — the existing check stays, so nothing regresses.

### Event contract (Hard requirement 9)

One channel, owned by `libs/tutorial-tours.js`:

```js
const CHANNEL = 'tutorial:trigger';
// raise:  Tours.fire('share')   →  RADIO_BROADCAST.trigger(CHANNEL, { tour: 'share' })
// listen: desk_module only, bound in initialize() beside the other RADIO_BROADCAST binds (index.js:67-129)
```

**Two pieces of state, two lifetimes — never conflated** (R1):

| Member | Set | Cleared | Purpose |
|---|---|---|---|
| `_inFlight` (one tour id, or null) | synchronously inside `fire()`, before the broadcast | by `Tours.release()`, called from `desk_module`'s `destroy` handler on the mounted tutorial (C7) — **or**, if the tour never mounts, by the `GUARD_TIMEOUT_MS` fallback timer | single-flight (Hard requirement 8) + double-click suppression |
| `_guardTimer` | armed in `fire()`, alongside `_inFlight` | **cancelled on mount** by `Tours.armed()` from `tutorial_main.onDomRefresh` (C4); thereafter only `release()` clears `_inFlight` | bounds the *chunk fetch*, nothing else |
| seen-set (memory + localStorage + POST) | **only** by `markSeen(tourId)` | never (localStorage entry pruned once the server map confirms it) | once-ever suppression |

`fire(tourId)` — the only public trigger API — does all gating itself and **writes nothing to the seen-set**:

1. kill switch off → return
2. `Visitor.isMobile()` → return (D9)
3. tour already seen (union of memory + localStorage + `Visitor.settings().tutorials_seen`) → return
4. `_inFlight` non-null → return (single-flight)
5. set `_inFlight = tourId`, arm the guard timer, `RADIO_BROADCAST.trigger(CHANNEL, {tour: tourId})`

`end-tour` — raised by the callout's skip control at **`tutorial_main`**, not at
the step. It is the one callout service that does not belong to the step widget
(see D4). `tutorial_main` answers it with `_skipTour()`.

`markSeen(tourId)` — called from `tutorial_main.onDomRefresh` once the tour has actually mounted, and directly from the onboarding-skip path (D4) and from the `full`-tour exit (S7):

1. add to the in-memory set
2. write the localStorage mirror synchronously
3. POST `drumate.tutorial_seen {tour_id}` (S5 retry policy)

**Guard timer lifecycle** (was R8). The timer exists only because a tour that never mounts never destroys — a chunk that 404s would otherwise wedge every tour for the rest of the session. It therefore covers **the fetch and nothing else**:

```
fire()          → _inFlight = id ; _guardTimer = setTimeout(release, GUARD_TIMEOUT_MS)
onDomRefresh()  → Tours.armed()   : clearTimeout(_guardTimer)      ← tour is on screen
destroy         → Tours.release() : _inFlight = null               ← tour is gone
```

Revision 2 armed the timer in `fire()` and left it to expire, justified as a chunk-fetch bound. That was wrong: a user reading 3–5 screens comfortably exceeds 30s, so the timer would fire *while the tour was on screen*, null `_inFlight`, and let a second trigger mount a second tour — breaking Hard requirement 8 in the ordinary case rather than the pathological one. Cancelling on mount makes `GUARD_TIMEOUT_MS` an honest fetch bound; 30s, the same order as the existing 20s `_homeSettledFallback` (`modules/desk/index.js` `case "overlay"` (the 20s net)), is then generous rather than arbitrary.

`release()` is idempotent and ignores a tour id that is not the current `_inFlight`, so a late `destroy` from a previous tour cannot clear a newer one's guard.

Trigger sites therefore contain exactly one line — `require('libs/tutorial-tours').fire('share')` — and hold no state. `desk_module`'s listener calls `this._showTutorial(tourId)`.

Rejected: `Wm.$el.trigger(...)` (the `desk:chrome` precedent at `modules/desk/index.js` `_syncWorkspaceTopbar`). It works, but it is a jQuery DOM event on the window-manager element, so a listener must survive WM re-feeds; `RADIO_BROADCAST` is process-global, already the desk's idiom for a dozen `desk:*` channels, and has the `libs/over-limit.js:106` precedent for exactly this lib-owns-channel shape.

### `_showTutorial(tourId)` and the post-home chain (Hard requirement 7)

```js
_showTutorial(tourId = 'full') {
  this.ensurePart("overlay").then((p) => {
    p.feed({ kind:"desk_tutorial", tour: tourId, sys_pn:"desk-tutorial", partHandler:this });
  });
}
```

Callers:

- **channel listener** → `_showTutorial(args.tour)` — the only path a contextual tour takes.
- **overlay branch** (`index.js:1759-1792`) → `Tours.fire('workspace')` when the kill switch is on, `_showTutorial('full')` when it is off (D3, D10). Going through `fire()` means the post-onboarding tour is seen-set-gated like everything else.
- **`?tutorial=<id>` / Get help** → `_showTutorial(id)` directly, bypassing `fire()` — explicit requests are exempt (D3), which is also why they keep working when the kill switch is off.

**`fire()` returns whether it broadcast, and the post-signup path is its first consumer.**

Until Phase 3 the overlay branch called `_showTutorial()` unconditionally, so
arming the 20s `_homeSettledFallback` was safe: a tutorial was always on its way,
and the net only had to cover one that failed to mount. Routing the branch
through `Tours.fire('workspace')` breaks that. `fire()` legitimately declines —
already seen, mobile (D9), another tour in flight, or the kill switch — and the
net would then become the *only* route to `_afterHomeSettled`, delaying the
reward flow, LAUNCH30 and the invited-workspace prompt by 18 seconds. For every
mobile signup, which is not an edge case.

So the branch asks first and arms accordingly, via `_launchHomeTutorial(explicit, forced)`:

| Route | Behaviour | Gated? |
|---|---|---|
| `?tutorial=<id>` / `?tutorial=1` | `_showTutorial(forced)` | never — a person typed it |
| kill switch off | `_showTutorial('full')` | never — today's behaviour exactly |
| otherwise | `Tours.fire('workspace')` | like any other trigger |

It returns true when something was launched. False means no tutorial is coming,
and the branch takes the same 2s settle the `else` arm has always taken.

`true` means *launched*, not *mounted* — the chunk can still fail, which is what
the net remains armed for. The net is armed **before** the 2s decision rather
than after it, so a throw inside that timeout still leaves it in place.

No other call site consumes the return value; every trigger discards it.

`onPartReady("desk-tutorial")` (`modules/desk/index.js` `case "desk-tutorial"`) gains a guard: the reward-flow / fallback chaining runs **only** when `child.mget('tour')` is `workspace` or `full` **and** `!this._homeSettledDone`. A contextual tour firing an hour later reaches `onPartReady` with `_homeSettledDone === true` and does nothing to the chain. The 20s `_homeSettledFallback` armed at `:1779` is untouched — it is armed in the overlay branch, which only the post-onboarding / `?tutorial=` path takes.

---

## 4. Server-side contract

### S1 — Schema

**Store in `entity.settings` under one reserved top-level key.**

```json
"tutorials_seen": { "workspace": 1755500000, "folder": 1755500123, "task": …, "share": …, "migrate": … }
```

Values are **unix seconds**, not booleans (answers "when did this user first click share?" without a client release). The canonical tour ids are `workspace`, `folder`, `task`, `share`, `migrate` — declared once in `modules/desk/tutorial/tours.js`, mirrored in the ACL doc string and in the server allow-list. They are **never** derived from `fig.family` or a class name.

Rejected: a dedicated `(hub_id, tour_id)` table. It buys per-row concurrency we get anyway from a single-statement merge, and costs a schema migration plus a **second boot request** — whereas `settings` already ships inside `get_env` (⚠ Correction 3). Rejected: extending the existing settings blob *through `update_settings`* — see S2.

`entity.settings` is `mediumtext NOT NULL` (`schemas/yellow_page/tables/entity.sql:27`), so every statement must guard `JSON_VALID`.

**Write the timestamp with an inlined `UNIX_TIMESTAMP()`, never from a routine variable.** MariaDB drops the numeric type of a `DECLARE`d variable on the way through `JSON_OBJECT`: with `DECLARE _now INT(11) UNSIGNED; SELECT UNIX_TIMESTAMP() INTO _now;` the proc writes

```json
"tutorials_seen": { "migrate": "1787093945" }   // a JSON STRING
```

while the bare call in the same position writes `1787093945`. Verified against `INT`, `INT UNSIGNED` and `BIGINT` — every integer type behaves the same, so this is not a width problem and no cast fixes it from a variable. It matters because the map is specified as unix seconds a report can compare numerically; the string form round-trips through the client unchanged and looks correct everywhere except in a `>` comparison. Anyone rewriting the proc will reach for a variable, so the procedure says this at the site.

### S2 — Write endpoint

**New service `drumate.tutorial_seen`.** `update_settings` is disqualified (⚠ Correction 2): shallow top-level merge from a session snapshot, then a whole-column overwrite.

```
POST drumate.tutorial_seen   { tour_id: "share" }         auth: session, scope hub, src owner
  → { tutorials_seen: { … } }        (the full map after the write)
POST drumate.tutorial_seen   { reset: 1 }                 dev-gated, see S8
```

`server-team` changes:

- `acl/drumate.json` — new `tutorial_seen` entry: `params.tour_id {type:"string", required:false}`, `params.reset {type:"boolean", required:false}`, `permission.src: "owner"`, `scope: "hub"`, **`"log": true`** (see S9), `returns.tutorials_seen {type:"object"}`.
- `service/private/drumate.js` — new `async tutorial_seen()` beside `update_settings()` (`:514`): validate `tour_id` against a hardcoded allow-list constant (`['workspace','folder','task','share','migrate']`) and reject anything else, so the free-form settings blob cannot be used as a write primitive; then `await this.yp.await_proc('drumate_tutorial_seen', this.uid, tour_id, reset)`.
  - **No constructor bind.** `__private_drumate` has neither a constructor nor method binds (`service/private/drumate.js` (the class declaration) opens straight onto its methods) — that pattern belongs to `service/private/hub.js:86`. The router dispatches by method name; a new service is just a new method.
  - **Error calls.** `this.exception.invalid_argument` does not exist. The class offers `server`, `user`, `email`, `bad_request`, `reject`, `unauthorized`, `forbiden`, `not_found`, `precondition`, `fatal` (`@drumee/server-core/lib/exception.js:117-175`). Use `bad_request('INVALID_TOUR_ID')` for an id outside the allow-list, and `forbiden()` for the reset dev gate — the latter is the established call for "authenticated but not allowed" (`service/private/channel.js:1426`, `service/private/secure_share.js:52`).

**The allow-list lives in three places** (was M2). There is **no mechanism in this repo for sharing a constant between `ui-team` and `server-team`**: `getServices()` (`server-team/router/rest/index.js:474-488`) flattens each ACL module to `{ns: {method: "ns.method"}}` — names only — before `platform.services` is assembled (`service/lib/env.js` (`platform.services`)), so params, enums and doc strings never reach the client. Nothing else crosses the boundary.

The three sites are:

1. `ui-team/src/drumee/modules/desk/tutorial/tours.js` — the `TOURS` keys (source of truth for the client)
2. `server-team/acl/drumate.json` — the `tour_id` doc string
3. `server-team/service/private/drumate.js` — the hardcoded validation constant

A mismatch fails as a **silently rejected write with no client-side symptom**: the tour runs, the user is suppressed locally by the mirror, and the server never records it — so it re-runs on their next device and nobody sees an error. Each site carries a comment naming the other two, and **adding a tour means editing all three**. Test 32 asserts the rejection path so the failure at least shows up in CI.

`schemas` changes (this repo's one-routine-per-file rule):

- `yellow_page/procedures/entity/drumate_tutorial_seen.sql` — **NEW** procedure.
- `patches/manifest.txt` — add that path.

```sql
-- illustrative body, single atomic statement
UPDATE entity
   SET settings = JSON_MERGE_PATCH(
     IF(JSON_VALID(settings), settings, '{}'),
     JSON_OBJECT('tutorials_seen', JSON_OBJECT(_tour_id, UNIX_TIMESTAMP()))
   )
 WHERE id = _id
   AND JSON_EXTRACT(IF(JSON_VALID(settings), settings, '{}'),
                    CONCAT('$.tutorials_seen."', _tour_id, '"')) IS NULL;
SELECT JSON_EXTRACT(settings, '$.tutorials_seen') AS tutorials_seen FROM entity WHERE id = _id;
```

### S3 — Idempotency and concurrency

The `AND … IS NULL` predicate makes the write **first-write-wins and idempotent**: a repeat posts, matches zero rows, and still returns the current map — never an error the client has to special-case. This is also what makes the duplicate post from a repeated onboarding wizard harmless (D3).

Concurrency is resolved at the storage layer: it is one `UPDATE` against one row, so InnoDB serialises the two statements on the row lock and each merges into the value the other just wrote. This is precisely what `update_settings` cannot do, and it is what test 22 exercises.

### S4 — Read path

**Already present at bootstrap.** `get_user` selects `settings` (`schemas/yellow_page/procedures/directory/get_user.sql`), `get_env` returns it inside `data.user` (`server-team/service/lib/env.js` `get_env` (the `data.user` payload)), `drumee.js:47/155` sets it on `Visitor`, and ui-core exposes `Visitor.settings()` (`letc/user.js:359`). `libs/tutorial-tours.js` reads `Visitor.settings().tutorials_seen` lazily on first use.

Guaranteed before the first possible click: the desk module cannot render until `init_globals` has run.

**Three states, not two** (was R7). Revision 2 said "fail closed if the map is absent or unparseable: treat as all tours seen". That was a defect: `settings.tutorials_seen` is *created by the first write*, so it is absent on every brand-new account — the exact population this feature exists for — and the rule would have made `isSeen()` return true for every tour on every fresh signup. No contextual tour would ever have fired for anybody. It also contradicted S7, which already draws the correct line (`tutorial_done` truthy **and** `tutorials_seen` absent → all seen).

`isSeen()` therefore reads the server side as:

| State | Meaning | Behaviour |
|---|---|---|
| `Visitor.settings()` missing, or not an object | degraded / partial bootstrap payload | **fail closed** — all seen, write nothing |
| `settings` present, `tutorials_seen` **absent** | normal new user — or a pre-existing user, resolved by S7's `tutorial_done` inference before this rule is reached | **empty seen-set — every tour armed** |
| `settings.tutorials_seen` present but not an object | corrupt | **fail closed** — all seen, write nothing |
| `settings.tutorials_seen` present and an object | normal | seen = its own keys |

Order matters: the S7 `tutorial_done` inference is evaluated on the second row only, and returns *all seen* for a legacy user. The two fail-closed rows also suppress **writes**, so a degraded boot can never record a tour the user did not see.

Cost of the two fail-closed rows: a user hitting a degraded boot sees no tours that session and gets them on the next clean one. That is the correct trade — the failure they cover is a partial payload, which is rare, whereas an absent map is the default state and must not be conflated with it.

### S5 — Write failure

- One retry after 3s, then give up. No user-visible error — a tour is not an operation the user asked to perform.
- The `localStorage` mirror (`drumee.tutorials_seen`) is written **synchronously inside `markSeen()`, before the POST**, so the current device stays suppressed regardless of the outcome.
- A permanently-failed write means the tour can re-run once on a *different* device — until the first-use catch-up in S6 lands it. Accepted: the alternative (blocking the tour on an ack) means an offline user sees nothing, which is worse.

### S6 — Cache and reconciliation

Precedence is **union**: seen in memory ∪ localStorage ∪ `Visitor.settings().tutorials_seen`. A false "seen" costs one missed tour; a false "unseen" is a repeated interruption.

**Reconciliation happens once per session, on first use, before any tour can be gated** — not opportunistically inside `fire()`. The previous revision put the retry there, which was unreachable: a localStorage hit is part of the seen union, so `fire()` returns at step 3 and never reaches a retry (R5).

`Tours.reconcile()` is **lazy-only**: it runs on the first `isSeen()` / `fire()` / `markSeen()` call, guarded to run once (was M1). Module init is explicitly **not** a trigger — a `require()` evaluated before `Visitor.set(user)` (`drumee.js:155`) would read an empty settings object, conclude that every mirror entry is missing from the server map, and re-POST ids that are already recorded. Every lazy entry point is reached from the desk, which cannot render before `init_globals` has run (S4).

Steps:

1. read the server map from `Visitor.settings().tutorials_seen`
2. for each id in the localStorage mirror **present** in the server map → drop it from the mirror (durably recorded)
3. for each id in the mirror **absent** from the server map → re-POST it via the same path `markSeen()` uses, and leave it in the mirror until a later boot sees it land

This is the catch-up for an S5 failure, and it is self-healing across sessions on the same device. It never fires a tour and never broadcasts.

### S7 — Migration, and what `full` completion means

Two mechanisms, for two different populations:

**Pre-existing users** carrying `settings.tutorial_done === true` completed the old monolithic tour. **Inferred client-side** in `libs/tutorial-tours.js`: if `tutorial_done` is truthy **and `tutorials_seen` is absent**, the effective seen-set is *all tours*.

Rejected: a server-side backfill (`UPDATE entity SET settings = JSON_MERGE_PATCH(...) WHERE JSON_EXTRACT(settings,'$.tutorial_done') = true`). It would touch every row of a FULLTEXT-indexed `mediumtext` column for a fact a one-line client read gives free.

**Users who complete the `full` tour from Get help or `?tutorial=1`** are handled by writing, not by inference. `_enterWorkspace()` (`modules/desk/tutorial/index.js` `_enterWorkspace`), when the active tour is `full`, calls `markSeen()` for **every flagged tour** (`workspace`, `folder`, `task`, `share`, `migrate`) as well as keeping the legacy `tutorial_done` write.

**This holds only while the kill switch is on.** `markSeen()` returns early when it is off (D10), so a `full` tour completed with the feature disabled records nothing but the legacy boolean — which is correct, because with the switch off there are no contextual tours to suppress. The consequence is stated in D10: switching on afterwards lets those users meet the contextual tours despite having seen the content.

Rejected: making the absent-map inference unconditional. That was the previous revision's asymmetry (R3): once *any* contextual tour had fired, the map existed, so a later `full` run wrote only the legacy boolean and the remaining tours still interrupted the user. Writing the flags makes `full` mean what it says — you have seen everything — regardless of what the map already contained. The `IS NULL` predicate (S3) makes the already-set ones no-ops.

The legacy `tutorial_done` key is **left in place and still written** — removing it would break the inference for any older client still reading it, and it costs one key.

### S8 — QA reset

`?tutorial=reset` → `libs/tutorial-tours.js` clears the localStorage mirror and the in-memory set, and posts `drumate.tutorial_seen {reset:1}`, which sets `settings.tutorials_seen = JSON_OBJECT()` and deletes `$.tutorial_done`.

**Ships to production, gated on `Visitor.profile().devel`** (the existing dev gate, `builtins/media/core.js:339`). The server re-checks `devel` on the profile rather than trusting the client. Without this, nobody can test the feature twice on one account.

### S9 — Analytics: a deliberate choice, not a freebie

The seen-record itself is **suppression state only**, and would work perfectly with `"log": false`. Setting `"log": true` on the ACL entry is a **separate, deliberate decision** with its own cost, and is recorded here as such rather than presented as something that falls out of the ACL.

**What it creates.** Each call writes a `yp.services_log` row — `name`, `args`, `uid`, `hub_id`, `headers`, `ctime` (`schemas/yellow_page/tables/services_log.sql`). Because `markSeen()` is called exactly once per tour per user, the result is a **per-user, timestamped behavioural event stream**: when this person first opened a workspace, first opened the Tasks tab, first shared a file, first opened + New. Five rows per user, each with a request-header blob.

**Where it goes.** `services_log` is already exported to the user in the GDPR/account-export path (`server-team/offline/drumate/backup.js:248`), so these rows are user-visible and subject to the same retention as the rest of that table.

**Would suppression work without it?** Yes, entirely. The `tutorials_seen` map holds the same timestamps, minus the headers and minus the per-call granularity. Anyone asking "when did this user first click share" can read `settings.tutorials_seen.share`.

**Decision: `"log": true`, accepted.** The marginal privacy surface over the `tutorials_seen` map is the request headers and the row's presence in `services_log`, both of which every other logged drumate service already produces for these same users (`acl/drumate.json` (the logged entries), `:534`, `:581`, `:610`, `:810`, `:817`). The benefit is that product can answer questions about trigger *rates* — how many users ever reach the Tasks tab — which the settings map cannot answer, because it only records users who reached it. No separate telemetry call is added.

**If privacy review objects**, the mitigation is one character: `"log": false`. Suppression is unaffected; only the rate analytics are lost. This should be an explicit sign-off, not a default — see §9.

> **Shipped in Phase 1 with `"log": false`**, diverging from the decision above. OQ4 records the privacy sign-off as still outstanding, and the asymmetry favours waiting: not creating per-user behavioural rows you may have to delete beats creating rows you may have to justify. The TODO sits in the `tour_id` doc string in `acl/drumate.json`. Flip it to `true` when the sign-off lands; nothing else changes.

---

## 5. Change list (client)

| # | Path | Change | Size |
|---|---|---|---|
| C1 | `src/drumee/libs/tutorial-tours.js` **NEW** | Members with **separate lifetimes**: `_inFlight` + `_guardTimer` (both set in `fire()`; timer cancelled by `armed()`, `_inFlight` cleared by `release()`); seen-set = in-memory `Set` + localStorage mirror + POST, written **only** by `markSeen()`. API: `CHANNEL`, `fire()`, `armed()`, `release()` (idempotent, id-checked), `markSeen()`, `isSeen()` (**three-state server read, S4**), `reconcile()` (**lazy-only, once-guarded, M1**), `reset()`. Plus kill switch, mobile gate, legacy `tutorial_done` inference | **M** |
| C2 | `src/drumee/modules/desk/tutorial/tours.js` **NEW** | `TOURS` registry, seven entries (five flagged + `meeting` + `full`); per-entry `badge: 'screens' \| 'steps'` (D2); canonical tour-id strings, with a comment naming the two server allow-list sites (M2) | **S** |
| C3 | `src/drumee/modules/desk/tutorial/skeleton/toolkit/backdrops.js` **NEW** | named backdrop composers; re-derived per tour | **S** |
| C4 | `src/drumee/modules/desk/tutorial/index.js` | `_widgets` from `TOURS[mget('tour')]`; `_widgetAt` composes backdrops; pass `badge_mode` / `badge_text` / `is_first` / `screen_count` down (R10); `_preloadSteps` warms the active tour only; in `onDomRefresh` — **`Tours.armed()`** to cancel the guard timer (R8) and **`Tours.markSeen(tour)`** when the tour is flagged; `end-tour` service; `_enterWorkspace()` keeps the `tutorial_done` write and, when `tour === 'full'`, calls `markSeen()` for every flagged tour (S7) | **L** |
| C5 | `src/drumee/modules/desk/tutorial/{workspace,folder,meeting,task,share,migrate}/index.js` | delete 14 hardcoded `badge_text` literals; read `this.mget('badge_text')`; `hide_back` from `is_first`; `done` from registry position | **M** ×6 |
| C6 | `src/drumee/modules/desk/tutorial/skeleton/toolkit/tooltip.js` | add the skip `×` (service `end-tour`, `uiHandler:[ui]`) beside the existing `hide_back` / `done` handling at `:74-93` | **S** |
| C7 | `src/drumee/modules/desk/index.js` | `_showTutorial(tourId)`; `RADIO_BROADCAST.on(Tours.CHANNEL, …)` in `initialize` (`:67-129`) + `off` in the teardown at `:393`; in `onPartReady("desk-tutorial")` (`:1794`) — **`child.once(_e.destroy, () => Tours.release(child.mget('tour')))` for EVERY tour** (R8; sits beside `_chainRewardFlowAfterTutorial` at `:2533`, which already hangs off the same event, but is deliberately outside the chain gate), then gate the chain on `tour ∈ {workspace, full}` && `!_homeSettledDone`; overlay branch (`:1759`) calls `Tours.fire('workspace')` (flag on) or `_showTutorial('full')` (flag off); `Tours.markSeen('workspace')` in case `"onboarding-completed"` (`:3316`); parse `?tutorial=<id>` and `?tutorial=reset`; `onPartReady` case `"addmenu"` → `menu.on(_e.open, …)` → `Tours.fire('migrate')` + prefetch | **L** |
| C8 | `src/drumee/modules/desk/wm/index.js` | in case `"open-node"` (`:2013`), after `openContent`, `if (['hub','folder'].includes(cmd.mget(_a.filetype))) Tours.fire('folder')`; prefetch in `onPartReady(_a.list)` (`:1186`) | **S** |
| C8b | `src/drumee/modules/desk/workspace-list/index.js` | `Tours.fire('folder')` in case `"load-workspace"` (`:159`) and case `"load-folder"` (`:179`) — the sidebar routes, per ⚠ Correction 4 | **S** |
| C9 | `src/drumee/builtins/window/folder/index.js` | case `"folder-manage-access"` (`:1531`): `if (!this.isShowSettings) Tours.fire('share')` **before** `openManageAccess()`; prefetch `share` + `task` kinds on mount | **S** |
| C10 | `src/drumee/builtins/media/interact.js` | case `'secure-share'` (`:837`): `Tours.fire('share')` as the first statement | **S** |
| C15 | `src/drumee/builtins/window/folder/index.js` | case `"tab-task"` (`:1690`): `Tours.fire('task')` before `showFolderTab(_a.task)` (D11) | **S** |
| C11 | `src/drumee/seeds.js` | delete the `tutorial_settings` entry (`:143`) | **S** |
| C12 | `src/drumee/modules/desk/tutorial/settings/**` | delete the retired module | **S** |
| C13 | `locale/{en,fr,es,ru,km,zh}.json` | add `TUTORIAL_STEP` = `"STEP {0}/{1}"`. **`SKIP_TOUR` already exists in all six** — no work | **S** |
| C14 | `src/drumee/modules/desk/tutorial/skin/tooltip.scss` | style the skip `×` | **S** |

### Scoped, listed-not-done (per the constraints)

| # | Item | Note |
|---|---|---|
| X1 | Extract the duplicated share gate (`folder/skeleton/topbar.js:71-95` ↔ `window/skeleton/toolkit/index.js:1659-1672`) into one predicate | **Not a drive-by.** This work does not touch the gate — both paths raise `folder-manage-access`, so C9 covers both from the single handler. Risk if done: the gate decides *visibility* of a control that mints `can_edit` links; a mistake in extraction is a privilege leak, and it needs its own review. |
| X2 | De-duplicate the navigate-and-repartition preamble (`utils.js:457`, `breadcrumb/index.js:287`, `:325`, `modules/desk/wm/index.js` `loadWorkspace`) | **Not touched.** This plan adds nothing to the navigation path — the `folder` trigger lives in `open-node` (C8) and in the workspace-list cases (C8b), before navigation, so the four copies are not a hazard for this work. Listed because any future change there is 4-way. |
| X3 | Localise the callout `title` / `desc` copy | **Separate ticket** (was OQ2). All 14 sets are raw English literals in the step modules — a standing violation of `.claude/rules/framework-invariants.md` §5. ~40 keys × 6 languages ≈ 240 entries, which would make this plan's diff unreviewable, and the copy is likely to be rewritten anyway as part of splitting the tours. `TUTORIAL_STEP` and `SKIP_TOUR` stay in scope (C13). |

---

## 6. Phasing

**Phase 1 — desk-owned surfaces, full vertical slice** *(fixed by the brief)*
Server: `drumate_tutorial_seen.sql` proc + manifest, `acl/drumate.json`, `service/private/drumate.js`, `service/lib/env.js` flag.
Client: C1, C2, C3, C7 (partial: `_showTutorial(tourId)`, channel bind, chain gate, addmenu hook, `?tutorial=<id>`), C8, C8b, C4 **including `markSeen()` on mount and the `full`-writes-all rule**, C5 (migrate + folder), C13 (`TUTORIAL_STEP`).
Ships: `migrate` (3 screens) and `folder` (3 screens) fire contextually, are recorded server-side **on mount**, badges are derived, Done renders on the last screen. Kill switch defaults **off**; behind the flag nothing changes.
Exercises: registry, derived badges, backdrops, single-flight + guard timeout, mark-on-mount, persistence round trip, lazy reconciliation, chain gating.

**Mark-on-mount is in this phase, not Phase 4** (R2). It is not optional scaffolding: `_enterWorkspace()` is reachable only by completing every screen (`modules/desk/tutorial/index.js` `_nextStep`), the overlay is destroyed without it by three separate feed paths (`modules/desk/index.js` `_showTutorial`, `:2077`, `:2661`), and there is no close affordance (`…/toolkit/tooltip.js` `tooltipBadge` (the card)). Shipping a contextual trigger with mark-on-Done means a reload mid-tour replays the tour on the next qualifying click, indefinitely. That is not "today's known behaviour" — today's tour runs once per signup, not once per navigation gesture.

**Phase 2 — cross-tree triggers**
C9, C10, C15, C5 (share + task), plus the `share` and `task` registry entries. First use of the channel from outside the desk tree; the two share entry points share one flag, and `task` gets its own (D11). Independently shippable: if it regresses, revert three one-line call sites.

**Phase 3 — post-onboarding rewiring**
C7 (remainder): the overlay branch routes through `Tours.fire('workspace')` when the flag is on; `Tours.markSeen('workspace')` on the onboarding-skip path; C5 (workspace); verify the reward-flow / LAUNCH30 / invited-workspace chain still fires (tests 1–4). Deliberately last of the behaviour phases: it is the only one that touches a path every new signup takes.

**Phase 4 — skip control**
C6, C14, C13 (`SKIP_TOUR`). What ships without it is tours that **suppress correctly on mount** but that the user cannot dismiss early: once a tour starts, the only ways out are pressing through every screen, reloading, or something else feeding the overlay. That is a real UX gap, not a correctness one — which is why it is separable from Phase 1 and why it must not be dropped.

**Phase 5a — cleanup** *(built)*
C11, C12 (delete `tutorial_settings`), C5 for `meeting`. Dark, reversible, no
user impact. After it, every step badge is derived and `?tutorial=1` is the one
check standing behind six edits.

**Phase 5b — rollout** *(procedure only; no code)*
Flip `contextual_tours` on, then delete the flag, the `full`-vs-`workspace`
branch and the `_showTutorial('full')` fallback. This is the first moment the
feature reaches a real user, and it is blocked on the runbook sign-off (Blocks
A–E, never worked) and on OQ4. Written up in `…-rollout.md`, including the point
that the flag is boolean per deployment — there is no percentage ramp — and that
`full` must remain reachable by `?tutorial=1` and Get help → Product Tour after
the branch is gone, since `tutorial_meeting` has no other route (D7).

X1/X2/X3 remain open, unscheduled.

---

## 7. Risks & rollback

| Risk | Mitigation |
|---|---|
| A contextual tour interrupts a user mid-task | Bounded by once-ever suppression and the D4 skip control. `contextual_tours: 0` (or the key's absence) disables all of it without a client deploy. |
| **8 screens on the desk's primary navigation gesture** | Resolved structurally by D11: `folder` is 3 screens on workspace/folder open, `task` is 5 on a deliberate Tasks-tab click. The residual for `folder` is 3 screens over a `loadWorkspace` that is repartitioning the grid underneath (`modules/desk/wm/index.js` `loadWorkspace` → `_prepareListPartition`) — the mock desk hides that work, and the real grid is settled by the time the overlay clears, which reads better than watching it rebuild. |
| The post-home chain (reward flow / LAUNCH30 / invited-workspace) breaks | Phase 3 is isolated and last. The chain gate is a positive test (`tour ∈ {workspace, full}`), so an unrecognised tour id can only *skip* the chain-arming, never double-arm it. Tests 1 + 2 are the gate. |
| **A gated post-signup tour delays the chain** — `fire()` declines, nothing mounts, and the 20s net becomes the only route to `_afterHomeSettled` | `_launchHomeTutorial` reports whether anything launched; a false takes the existing 2s settle. Without it every mobile signup waits 18s longer for the reward flow, LAUNCH30 and the invited-workspace prompt. One test per decline reason, each produced against the real `fire()`. |
| A contextual tour blocks the chain | Impossible by construction: `_afterHomeSettled` is once-per-session (`modules/desk/index.js` `_afterHomeSettled`) and a contextual tour reaches `onPartReady` with `_homeSettledDone` already true. |
| Two tours mount at once | `_inFlight` in `Tours.fire()`. The existing `_startProductTour` guard (`modules/desk/index.js` `_startProductTour`) already covers the second case on its own and needs **no** change: every tour mounts under the same kind `desk_tutorial`, so its `kind === "desk_tutorial"` test blocks launching `full` over a running contextual tour just as it blocked a double launch before. An earlier revision asked for it to also test `mget('tour')`; that would be dead code. |
| **The single-flight guard wedges the feature** — a tour that fires but never mounts never destroys, so `_inFlight` never clears | `GUARD_TIMEOUT_MS` fallback timer armed alongside `_inFlight`, **cancelled on mount** by `Tours.armed()` so it only ever bounds the chunk fetch (§3). Test 43a. |
| **The guard releases while the tour is still on screen** — the mirror-image failure: a timer left running through a 3–5 screen read expires mid-tour and lets a second tour mount | Same fix from the other side: `armed()` cancels the timer at mount, after which only the tutorial's `destroy` clears `_inFlight` (C7). Test 43b. |
| A brand-new account never sees any tour | S4's three-state read: an **absent** `tutorials_seen` is a new user (armed), not a failure (suppressed). Test 47 asserts it directly against an account with no `settings` write. |
| Every contextual badge reads "STEP 1/1" | Registry-declared `badge` mode (D2), decided before C5 deletes the hardcoded strings. Tests 48, 49. |
| A tour is marked seen but never rendered | `markSeen()` runs in `tutorial_main.onDomRefresh`, which only executes if the chunk loaded and the widget mounted. `fire()` writes nothing to the seen-set (R1). Test 44. |
| Trigger state lost on topbar rebuild | All state is in `libs/tutorial-tours.js`; the `onPartReady("addmenu")` bind is re-established on every re-feed by construction. Tests 11, 12. |
| Server write lost between tabs | The single-statement `JSON_MERGE_PATCH` with the `IS NULL` predicate. This is the specific defect `update_settings` has (⚠ Correction 2) and the reason for a new endpoint. Test 22. |
| `entity.settings` corrupted by a bad merge | `JSON_VALID` guard in the proc; the write only ever adds one nested key and never rewrites the blob wholesale. |
| **Skip re-pointed at `_enterWorkspace()`** — a later change routes `end-tour` through the Done path, and a dismissed three-screen tour writes `tutorial_done` and marks all five | Two tests run the real `_skipTour` and `_enterWorkspace` bodies side by side, plus one asserting `_skipTour` never mentions `_enterWorkspace`. |
| A `full` run leaves contextual tours armed | `_enterWorkspace()` writes every flagged tour when `tour === 'full'` (S7). Test 41. |
| Mobile users silently lose the tours | Accepted and explicit (D9): flags are **not** written on mobile, so the desktop session still gets them. |
| `services_log` growth / privacy | Five rows per user, ever (S9). Reversible with `"log": false`; sign-off tracked in §9. |

**Rollback.** Phases 1–4 are each revertable independently. The global kill switch is server-side config (`/etc/drumee/conf.d/myDrumee.json`), so the fastest rollback needs no client deploy. The server endpoint is additive — leaving it deployed after a client revert is inert, and the `tutorials_seen` key it wrote is ignored by the old client.

---

## 8. Test matrix

The brief's 28 scenarios are adopted verbatim, with **test 5/6/7 now reading `folder` rather than `folder_task`**, and test 18's cross-step Back case moving to the `full` tour (the only remaining multi-step tour besides `full` after D11). Additions:

29. **Kill switch off** → post-onboarding runs `full`, no trigger fires, no `tutorial_seen` POST is issued at all (assert on the network, not the UI).
30. **Kill switch flipped on mid-session** → no tour fires retroactively; the next qualifying click does.
31. **Unknown tour id** — `?tutorial=nope` → no tour, no crash, no chain damage (home still settles).
32. **`tutorial_seen` posted with an id not in the server allow-list** → rejected, `settings` unmodified.
33. **`entity.settings` is empty string / invalid JSON** → the proc's `JSON_VALID` guard produces `{"tutorials_seen":{…}}` rather than a NULL write.
34. **`services_log` row exists per first-trigger** with the tour id in `args` (S9), and **no** row for a suppressed click.
35. **Backdrop correctness per tour** — `tutorial_task` standing alone (not the fourth of six), `tutorial_share` and `tutorial_migrate` standing alone. Visual check against the current 6-step renders.
36. **Skip control** (post-Phase 4) exits via `softDestroy()`; the tour is already marked seen from mount, so re-triggering does not occur either way.
37. **`?tutorial=reset` as a non-`devel` user** → refused server-side, seen-set intact.
38. **Two different tours triggered in two tabs concurrently** → both recorded, neither tab shows the other's tour.
39. **`full` tour still contains `tutorial_meeting`** and its badge reads 3/6 — the only route to that module (D7).
40. **Tablet 768–1024px** → tours run; `Skeletons.Menu` cluster present; `migrate`'s `_placeMenu()` finds `.tutorial-main__tb-new-workspace-btn`.
41. **Complete `full` from Get help** → afterwards, no contextual tour fires on any trigger; `settings.tutorials_seen` contains all five ids **and** `tutorial_done` is still true (R3, S7).
42. **Sidebar workspace row and sidebar folder row** each fire `folder` on first use; a user who only ever navigates from the sidebar still gets it (OQ3, C8b).
43a. **Fire a tour, then prevent the chunk from loading** (throttle / block the request) → after `GUARD_TIMEOUT_MS` a *different* trigger can still fire its tour; the feature is not wedged for the session (R1, R8).
43b. **Slow read** — fire a tour, mount it, then sit on screen 1 for **longer than `GUARD_TIMEOUT_MS`** (≥ 60s at a 30s setting). A second trigger during that window must **not** mount a second tour: `armed()` cancelled the timer at mount, so only `destroy` releases the guard (R8).
44. **Same scenario, seen-set check** → the blocked tour is **not** marked seen, and fires again on the next qualifying click (R1, D4).
45. **Tasks tab first click** → `task` runs (5 screens); the Tasks tab also opens. Second click → no tour. Opening a workspace tile still fires `folder` independently (D11).
46. **Write fails (offline), reload while still offline** → no tour on the same device (local mirror); go online and reload → `reconcile()` re-POSTs the id, and a third reload finds it in the server map and drops it from the mirror (R5, S6). Assert `reconcile()` runs **after** `Visitor.set(user)` — an account whose server map is already complete must issue **zero** re-POSTs (M1).
47. **Brand-new account, no `settings` write ever performed** — `settings.tutorials_seen` absent, `tutorial_done` absent. The first qualifying click **fires its tour** (R7). Assert on the absent-map state directly, not via tests 5/45, which assume it. Then the degraded case: stub `Visitor.settings()` to return `undefined`, and assert **no** tour fires and **no** POST is issued.
48. **Badge on every screen of a single-step tour** — `migrate` reads STEP 1/3 → 2/3 → 3/3; `share` and `folder` likewise; `task` reads 1/5 → 5/5. No screen reads "1/1" (R10).
49. **Badge inside `full`** — steps read 1/6 … 6/6, `tutorial_meeting` at 3/6 (extends test 39), and a multi-screen step's screens all carry that step's number rather than their own (R10).
50. **Mobile signup completes onboarding** → **no** tour of any kind, and **no** `tutorials_seen` write, so the same account's first desktop session gets `workspace` (D9, R9). Run on a real mobile viewport, not a resized desktop, so `Visitor.isMobile()` is genuinely true.

---

## 9. Open questions

Two items.

**OQ6 — can a click reach the real desk while a tour is up?** Raised in Phase 4
and **unresolved**. It decides how load-bearing single-flight actually is: if the
overlay swallows clicks, the cross-tree collision (a share control clicked during
a running `folder` tour) cannot be produced in the product at all, and the
automated test is its entire coverage.

It could not be settled from source. The spotlight's own layers are all
`pointer-events: none` and pass clicks through (`spotlight/skin/index.scss:24,44,57`;
only `__callout > *` is `auto`), but the layer they sit in —
`.desk-module__overlay` (`modules/desk/skin/index.scss:47-57`) — computes
`opacity: 0; pointer-events: none`, and nothing writes its `[data-state="open"]`
for a tutorial (`_setMobileBackdrop` is the only writer, and only for the mobile
drawer). Measured in headless chromium against the compiled skins: the tutorial
subtree inherits `pointer-events: none` and a click lands on the real desk
beneath — but the same reading makes the tour **invisible**, which it plainly is
not. So the running app differs from the static reading in a way that was not
found; `builtins/widget/reward-flow/index.js:245-259` documents having hit the
same layer and portals itself to `document.body` to escape it.

**Ruled out since (all static, Phase 5 follow-up A-1):**

1. *The class and the part are on different nodes.* No — `Skeletons.Wrapper.Y`
   (`ui-core letc/toolkit/skeleton/wrapper-y.js`) merges `className` and keeps
   the caller's `sys_pn`, so `.desk-module__overlay` and `sys_pn: "overlay"` are
   the same element. Its `wrapper: 1` flag is inert — nothing in ui-core reads it.
2. *The tutorial portals out, like reward-flow.* No — the only `closest()` in the
   whole tutorial module is `…/tutorial/migrate/index.js` `_placeMenu`, scoping a `querySelector`.
   Neither `tutorial_main` nor the spotlight re-parents anything.
3. *A `.dialog__wrapper` rule overrides it.* The Wrapper does add that class, but
   no base rule for it sets `opacity` or `pointer-events`.
4. *Something later in the cascade wins.* No — compiled the **entire** desk
   stylesheet: `opacity: 0` stands unless `[data-state=open]`, and the only
   writer of that literal is `_setMobileBackdrop` (mobile drawer). `setState()`
   writes `data-state="1"`, which does not match the rule.
5. *The rule is inside a media query or another conditional parent, so it never
   applies on desktop — and the measurement ran at headless Chromium's 800×600
   default.* No, on both halves. **Source:** the only blocks enclosing the
   declaration are `.desk-module {` and `&__overlay {` (`skin/index.scss:20,47`)
   — no `@media`, no `[data-device]` parent, no `:not()` wrapper. **Compiled:**
   brace depth immediately before the rule is **0**, i.e. top level, so nothing
   conditional wraps it in the output either. **Measured:** identical computed
   values at 1440×900 and at 375×812 (`opacity: 0`, `pointer-events: none` on
   the overlay in both) — and the original measurement had already passed
   `--window-size=1440,900`, so viewport was never the flaw.

So the static evidence is now **conclusive that a desktop tutorial fed into
`overlay` would be invisible** — which it is not. One premise about the running
app is therefore wrong in a way four static checks could not find.

**Resolution path:** runbook item **1.6** (the bundle check) already answers this
as a side effect — it is the first thing anyone does, and a tour appearing there
disproves the static reading outright. **A11a** then settles the pointer-events
half. Feed both answers back into §7 and into A11. Until then, treat "does the
tour render on desktop at all" as a live question, not a settled one.

The four from revision 1 are resolved into D4 (onboarding-skip), X3 (copy
localisation), D6/C8b (sidebar triggers) and S9 (analytics).

**OQ7 — who gets interrupted when the flag flips?** Raised by the rollout review.
Every trigger is "first interaction with this surface", **not** "new user", so
enabling the flag on a deployment interrupts its entire active population once
each, concentrated in the days after the flip. The seen-set has no notion of
account age and the flag is boolean per deployment, so there is no configuration
that limits tours to new accounts.

**Decision needed from product, before the flag is enabled beyond an internal
stage:** every existing user once, or new accounts only? If new accounts only, a
backfill of `tutorials_seen` must complete on that deployment *before* its flag
flips. Shape, sentinel and reversal are in `…-rollout.md` §2b; the sentinel
matters because a backfilled entry is otherwise indistinguishable from a genuine
one and the backfill would have no undo.

**OQ4 — sign-off on the rollout flag and on `"log": true`.** Two ops/privacy decisions, one owner, needed before Phase 1 ships:

| | Detail |
|---|---|
| File | `/etc/drumee/conf.d/myDrumee.json` |
| Key | `contextual_tours` — integer/boolean, **absent = off** |
| Server line | `platform.contextual_tours = global.myDrumee.contextual_tours ? 1 : 0;` in `server-team/service/lib/env.js`, immediately after the `over_limit_enforcement` line at `:148`, which it copies verbatim |
| Client read | `Platform.get("contextual_tours")` in `libs/tutorial-tours.js` — Platform exposes a getter, not properties; same shape as `libs/over-limit.js:31` reading `over_limit_enforcement` |
| Default | **off** for one release, flipped in Phase 5 |
| Second decision | `"log": true` on the `drumate.tutorial_seen` ACL entry — five timestamped behavioural rows per user in `yp.services_log`, exported by `offline/drumate/backup.js:248`. Suppression works identically with `"log": false`; only trigger-rate analytics are lost. Rationale and the reversal path are in S9. |
| Needs | Whoever owns `myDrumee.json` rollout keys to confirm the key name and the staged-on plan, and whoever owns privacy review to sign off (or veto) the log flag. |

## 10. Defects the Phase 1 tests caught

Kept because two of the three are design-adjacent: a reader of S6 or S4 who does
not know about them will write the same code again.

**1. `reconcile()` re-posted what `markSeen()` had just written** (S6). The
boot payload is a snapshot taken before any of this session's writes, so an id
`markSeen()` recorded a moment ago is legitimately absent from
`Visitor.settings().tutorials_seen`. The mirror holds it, the server map does
not, and reconciliation therefore classified it as a failed write and re-posted
it. Harmless on the server — the write is idempotent — but a wasted request per
tour, and it makes "did reconcile do anything" unassertable. `reconcile()` now
skips ids in the in-memory set. Surfaced by a test asserting one POST and
getting two.

**2. A degraded-payload test was asserting nothing** (S4). The harness passed
`settings: undefined` into a destructuring default of `{}`, so the "missing
payload fails closed" case was actually exercising the *empty settings* case,
which arms every tour. Two fail-closed assertions passed for the wrong reason.
Worth knowing because S4's three states are distinguished by exactly this kind
of nullish detail, and a stub that smooths it over tests the wrong branch.

**3. Mock timers must be installed after the module state is reset** (harness
only). `__resetModuleState()` calls `clearTimeout` on a timer id left by the
previous test; if the mock is already installed, the mocked `clearTimeout` is
handed a real id, silently drops it, and the suite sits for the guard's full
30s after the last assertion. Ordering, not correctness — but it costs 30s per
occurrence and looks like a hang.
