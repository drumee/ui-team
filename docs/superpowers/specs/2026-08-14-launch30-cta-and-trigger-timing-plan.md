# LAUNCH30 promo — email CTA wiring + trigger-timing change

Date: 2026-08-14
Status: plan only, no code written

## Scope

Four files, **two** repos (see Correction 2):

| File | Repo |
|---|---|
| `service/templates/free-month.html` | analytics-server |
| `service/index.js` | analytics-server |
| `test/mail-templates.test.js` | analytics-server |
| `src/drumee/modules/desk/index.js` | ui-team |

No `server-team` changes. No schema changes. `promo.claim`, `promo.dismiss`,
`promo.get_state` and `acl/promo.json` are untouched.

**Amended after Open Question 1 was resolved.** Answering it added a third
repo, analytics-ui, which is what sets `claimed`:

| File | Repo |
|---|---|
| `app/utils.js` | analytics-ui |
| `app/index.js` | analytics-ui |
| `app/skeleton/users-list.js` | analytics-ui |
| `app/skin/legacy.scss` | analytics-ui |

Four files there, not the larger set an explicit toggle needed: deriving the
flag from the template adds no state, no handler and no event case — it reuses
the picker's own render pass and the page's existing `data-disabled` styling.
The toggle built against option (a) touched the same four files but added a
control, its state, its handler and its event binding; all of that came back
out when the answer settled on (b).

---

## Corrections to the brief

Every anchor in the brief was re-derived by symbol. Three corrections change
the work; two change only the framing.

### 1. `_afterHomeSettled` does **not** take an `immediate` argument — material

The brief states it "already takes an `immediate` argument". It does not.
`_afterHomeSettled()` at `desk/index.js:2304` is declared with **no
parameters**.

The `defer` option the brief is thinking of lives one level down, on
`_maybeShowPromoLaunch30(surface, opt = {})` (`:2183`), read as `opt.defer`
(`:2184`) and passed by the chain at `:2325` as `{ defer: true }`.

So change 4 must **add** a parameter to `_afterHomeSettled` and thread it
through to the existing `defer`, not merely pass one that already exists. This
is a signature change to a method with four call sites, not a one-line edit.

### 2. `mail-templates` is not a repo — framing

Both files the brief attributes to a `mail-templates` repo live in
analytics-server: `service/templates/free-month.html` and
`test/mail-templates.test.js`. There is no `/home/drumee/mail-templates`. The
work spans two repos, not three. File count is unchanged.

### 3. There are **four** routes into `_afterHomeSettled`, not three — material

The brief lists three. `_chainRewardFlowAfterTutorial` (`:2411`) contains two
of them, not one:

```js
_chainRewardFlowAfterTutorial(tutorial) {
  if (tutorial && _.isFunction(tutorial.once)) {
    tutorial.once(_e.destroy, () => {
      this._afterHomeSettled();          // :2414  route (a) — real completion
    });
    return;
  }
  this._afterHomeSettled();              // :2418  route (d) — ref was unusable
}
```

Route (d) fires when the tutorial reference is missing or not an emitter — the
`p.feed(...)` / `p.children.last()` race documented at `:1842-1852`. That
comment records the tester finding the brief cites: the fall-through *"fired the
reward+promo check immediately, stacking the LAUNCH30 modal on top of an
in-progress tutorial (step 1/5, tester feedback #1)"*.

**Route (d) must stay deferred.** It is the single route where a tutorial may
still be on screen. Passing `immediate` there re-opens the exact bug at
`:1846` — more directly than the 20s fallback the brief warns about, because
(d) fires with no delay at all.

### 4. `reward-flow`'s `CAMPAIGN` is not exported — material to change 3

`builtins/widget/reward-flow/index.js:67` declares `const CAMPAIGN =
"free-storage"` as a module-local. The file's only export is the class
(`:2209`). Desk cannot import the name it needs to scope the match against.

Change 3 therefore needs a home for the constant. Options in
§"Change 3" below.

### 5. `_deliver` renders once per batch — decides change 5

`analytics-server/service/index.js:1348` `_deliver()` renders the template
**once**:

```js
const html = msg.renderFrom(tpl, data);   // :1357
...
await Promise.all(chunk.map(async (to) => mta.sendMail({ from, to, subject, html })));
```

One `html` string goes to every recipient in the campaign. A **per-recipient**
`claimed` flag is structurally impossible without restructuring `_deliver` into
a per-recipient render — which is out of scope and would also break the
`sendBatched` pacing that exists to respect the relay's per-IP cap.

`claimed` can therefore only be a **per-send** flag: the admin declares "this
send is an offer" or "this send is a welcome". See Open Question 1.

### Anchors confirmed unmoved

`seeds.js:248`, desk `:1731`/`:1740`/`:1846`/`:1995`, `promo.js:108`.
`_maybeShowPromoLaunch30` `:2183`, `_schedulePromoOffer` `:2138`,
`PROMO_OFFER_DELAY_MS` `:2121`, `_rewardCtaLink` `:1469`, `_mailData` `:1496`,
`_endpointBase` `:1440`, `REWARD_CAMPAIGN` `:17`, `MAIL_TEMPLATES` `:43`.

---

## Data flow after the change

```
admin sends "Free month" from the analytics dashboard
  └─ claim_reward()  → _mailData("free-month")  → _promoCtaLink()
        → https://{main_domain}{endpoint_path}/#/desk
             ?utm_source=email&utm_medium=email&utm_campaign=launch30
                                    │
                       recipient clicks (signed out or in)
                                    │
       router/index.js :49 (boot) / :385 (route) → captureCampaignArrival()
         → sessionStorage.drumee_campaign_arrival = "launch30"
         → stripCampaignParams()  (so a reload is not a second click)
                                    │
                      survives the sign-in full-page reload
                                    │
       desk _maybeStartRewardFlow  :1995  → arrival is NOT "free-storage"
                                          → left alone, NOT consumed
                                    │
       desk _maybeShowPromoLaunch30 → arrival IS "launch30"
                                    → force-open, skip the 5-min defer
                                    → consume the marker
                                    │
                            Wm.launch(state:"offer")  → Modal A
                                    │
                   user clicks "Unlock My Free Month" → promo.claim
```

Independently, on a genuine first run:

```
onPartReady("overlay") :1711
  ├─ (a) tutorial mounts → desk-tutorial part ready :1746
  │        → _chainRewardFlowAfterTutorial(child) :1750
  │        → tutorial.once(destroy) :2414 → _afterHomeSettled({ immediate: 1 })
  │                                          → Modal A NOW
  ├─ (b) 20s fallback :1731            → _afterHomeSettled()  → 5-min defer
  ├─ (c) else, no tutorial :1740       → _afterHomeSettled()  → 5-min defer
  └─ (d) chain fall-through :2418      → _afterHomeSettled()  → 5-min defer
```

---

## Per-file changes

### A. `analytics-server/service/index.js`

**A1 — add `PROMO_CAMPAIGN`.**
Where: beside `REWARD_CAMPAIGN` (`:17`).
What: `const PROMO_CAMPAIGN = "launch30";` with the same "MUST match" comment
`REWARD_CAMPAIGN` carries, pointing at the desk constant chosen in change 3.
Why: the name is a cross-repo contract; a literal in two files drifts.
Breaks if wrong: a mismatched name means the desk never recognises the arrival
and the CTA silently lands on a bare desk. Nothing errors.

**A2 — `_promoCtaLink(link)`.**
Where: beside `_rewardCtaLink` (`:1469`).
What: same contract — no `link` ⇒ `${this._endpointBase()}/#/desk?${MARKERS}`;
a `link` already carrying `utm_campaign=` is returned untouched; otherwise the
markers are appended to the hash arg-list when a hash exists, else to the query
string.

The hash/query append logic in `_rewardCtaLink` (`:1476-1489`) is ~14 lines and
is the part that is easy to get subtly wrong. **Recommendation:** extract it to
`_campaignCtaLink(link, campaign)` and reduce both named helpers to one-line
wrappers, so `_rewardCtaLink`'s signature, call site (`:1520`) and doc comment
all stay valid. This is a refactor of live reward-campaign code, so it lands in
its own commit ahead of the feature (see Sequencing).

Why the hash and not the query: `Visitor.parseModuleArgs` splits
`location.hash`, so `#/desk?utm_campaign=…` is what the desk reads first —
`_rewardCtaLink`'s comment at `:1461-1464` records this.

Breaks if wrong: markers on the query string only still work (`readUrlMarkers`
falls back to `location.search`, `campaign.js:61`), but markers on neither, or
a malformed hash, kill the campaign silently.

**A3 — route `free-month`'s link through it.**
Where: `_mailData(id)` (`:1496`), the `id === "free-month"` branch (`:1501`).
What: `link: this._promoCtaLink(this.input.get("link"))`, and **delete the
comment at `:1503-1508`** — it currently reads *"NO CAMPAIGN MARKERS, unlike the
reward link … markers here would decorate a link nothing reads"*. After this
change that is false, and a stale comment asserting the opposite of the code is
worse than none. Replace it with a pointer to the desk call site.

**A4 — pass `claimed` through.**
Where: same branch.
What: `claimed: this.input.get("claimed")`.
Blocked on Open Question 1 (who sets it).

**A5 — leave `MAIL_TEMPLATES` alone.**
`free-month`'s `gated: false` / `tracked: false` (`:52-57`) stay false. The
LAUNCH30 funnel is written on *claim* (`yp.promo_launch30`, via
`_promo_live.js`), not on send. `mail-templates.test.js:70-73` asserts this for
every non-reward id and must keep passing.

The `subject` may need to change if the offer variant ships — "Your free month
of Drumee Team starts now" is welcome-shaped. See Open Question 2.

### B. `analytics-server/service/templates/free-month.html`

**B1 — `claimed` conditional.**
Where: the four blocks that assert possession — greeting (`:44`), lead
(`:53-57`), CTA label (`:121`), closing paragraph (`:138`).
What: `<% var _claimed = (typeof claimed !== 'undefined' && claimed); %>` near
the existing `_ends` declaration (`:52`), then branch each block.

The `typeof` guard is mandatory, not stylistic: lodash `template` compiles with
`with(obj)`, so a bare reference to an absent key throws `ReferenceError` at
render time. Every existing var in this file is guarded the same way
(`:44, :52, :86, :116, :121, :156, :180-182`).

Copy for the unclaimed branch is lifted from Modal A's deck so the mail and the
modal the reader lands on say the same thing — `promo-launch30/skeleton/offer.js`
`PROMO_OFFER_TITLE` / `PROMO_CLAIM_CTA`, i.e. "Start your 1-month Team Plan
today" and "Unlock My Free Month".

**Default:** unclaimed/offer. A `claim_reward()` campaign send goes to the trial
list, who by definition have not claimed. Note this inverts what the file
renders today with no `claimed` key present — which is why the test must pin
both branches (see D2).

**B2 — the `_link` default becomes unreachable from `claim_reward()`.**
`:116` defaults `_link` to `https://drumee.com/`. Once A3 lands, `_mailData`
always supplies a marked link. Keep the guard — `mail-templates.test.js:93`
renders the template directly — but it is now a direct-render fallback only.
No code change; noted so nobody "cleans it up".

**B3 — hero artwork is untouched.**
The headline lives *in* the 600×200 PNG (`:28-34`), which reads "Your free month
of Drumee Team starts now". That is tolerable for both branches ("starts now" as
an invitation), so no new asset is in scope. Flagging it as a copy judgement the
design owner should confirm.

Breaks if wrong: an unguarded var throws at render and `_deliver` fails for the
whole batch — a hard failure, but a loud one, and `mail-templates.test.js`
catches it before it ships.

### C. `ui-team/src/drumee/modules/desk/index.js`

**C1 — name-scope the reward arrival (change 3).**
Where: `async _maybeStartRewardFlow()` (`:1957`), the block at `:1995-2001`.

Today:

```js
if (campaignArrival()) {                    // :1995  any campaign
  await this.postService(SERVICE.reward.track, { hub_id: Visitor.id, status: "clicked" });
  campaignArrival(true);                    // :2000  consumes it
}
```

`campaignArrival()` returns the campaign *string*; this tests it for
truthiness. Two consequences once a second campaign exists, and the second is
fatal to this feature:

1. A `launch30` click posts `reward.track status:"clicked"`, inflating the
   reward funnel with users who were never offered it.
2. `campaignArrival(true)` **consumes** the marker, and `_maybeStartRewardFlow`
   runs *before* `_maybeShowPromoLaunch30` in the chain (`:2324` then `:2325`).
   The promo would find nothing.

Fix: compare to the reward campaign name and only consume on a match.

Constant placement — `CAMPAIGN` is module-local to reward-flow and unexported
(Correction 4). Preferred: move the name into `libs/campaign.js` as an exported
`REWARD_CAMPAIGN`, add `PROMO_CAMPAIGN` beside it, and have reward-flow import
the former. That gives one definition per campaign, reachable by desk, the
widget, and any future caller — and `libs/campaign.js` is already the module
both sides import. Alternative (smaller diff, worse): export `CAMPAIGN` from
reward-flow and have desk import the widget module, which couples desk to a
lazily-loaded widget bundle. Recommend the former.

Breaks if wrong: (1) is a silent data-quality bug in a dashboard someone makes
decisions from; (2) is a silently dead CTA. Neither throws.

**C2 — force-open on a `launch30` arrival.**
Where: `_maybeShowPromoLaunch30(surface, opt = {})` (`:2183`).
What: read `campaignArrival()`; when it equals `PROMO_CAMPAIGN`, treat the
launch as forced — ignore `opt.defer` (skip `_schedulePromoOffer`, `:2207`) and
also launch for `state.state === "eligible_seen"`, not just `eligible_unseen`
(`:2195`). Consume the marker only once the modal has actually been launched.

Why `eligible_seen` too: a recipient who was shown Modal A on some earlier home
mount and dismissed it is exactly who this campaign is being mailed to. Leaving
the show-once flag in charge makes the CTA dead for most of the list. A
deliberate click outranks a passive impression — the same reasoning the billing
claim pill already uses (`billing/index.js:2112` `_reopenPromoOffer`).

Ineligible arrivals (`claimed_active`, `claimed_expired`, `ineligible`) fall
through to today's behaviour: no modal, plain desk. Consume the marker anyway so
it cannot re-fire on the next route.

Breaks if wrong: force-opening on `ineligible` shows an offer to someone who
cannot claim it, whose CTA then returns `NOT_ELIGIBLE` (`promo.js:181`) into a
`Wm.alert`. Failing to consume re-shows the modal on every hashchange for the
life of the tab.

**C3 — `immediate` on `_afterHomeSettled` (change 4).**
Where: `_afterHomeSettled()` (`:2304`) — signature change, per Correction 1.
What: `_afterHomeSettled(opt = {})`, and at `:2325`
`this._maybeShowPromoLaunch30("home", { defer: !opt.immediate })`.

Call sites, all four:

| Line | Route | Passes |
|---|---|---|
| `:2414` | tutorial `once(destroy)` — real completion | `{ immediate: 1 }` |
| `:1733` | 20s fallback, tutorial never mounted | nothing |
| `:1741` | else, no tutorial this session | nothing |
| `:2418` | `_chainRewardFlowAfterTutorial` fall-through | nothing |

Only `:2414` changes. The other three keep today's 5-minute defer.

Why (b)/(c)/(d) stay deferred:

- **(b) `:1733`** fires because `desk-tutorial` never signalled ready. The
  tutorial's state is unknown — it may be mid-mount and about to take the
  screen. The `:1720-1726` comment describes this branch as a safety net for
  "kind not loaded, widget throws, part never signals"; none of those is
  evidence the screen is clear.
- **(d) `:2418`** is stronger: it fires when the tutorial ref was unusable,
  which is the documented `:1842-1852` race in which the tutorial *is* running.
  Firing immediately here is the `:1846-1848` bug verbatim.
- **(c) `:1741`** is a returning user with no tutorial. Not the audience for
  the immediate path, and the 5-minute hold's original rationale (`:2196-2201`)
  applies to them unchanged.

**Re-entry guard — verified.** `_homeSettledDone` is read at `:2309` and set at
`:2310`, synchronously, as the first two statements of the method, before the
`_maybeShowOverLimit()` chain at `:2323` starts. There is no await between
them, so no interleaving is possible. A replayed "Product Tour" from Get help
(`:1894-1899`) runs the same `onPartReady("desk-tutorial")` → `:1750` →
`:2414` path, but the second `_afterHomeSettled` call returns at `:2309`. The
immediate path is therefore reachable **only on the first run of a session**,
which for the tutorial route means a genuine new user. Confirmed by reading;
not runtime-verified (see Verification).

Breaks if wrong: passing `immediate` from (b) or (d) puts a full-screen modal
over a live tutorial at step 1/5 — a shipped-and-reported regression, not a
hypothetical. Threading it but never passing it makes change 4 a no-op that
looks done.

### D. `analytics-server/test/mail-templates.test.js`

The suite is structural + a render pass, run with `node
test/mail-templates.test.js`. Extend the render section (`:90-109`).

**D1 — CTA marker.** Assert `_promoCtaLink`'s output shape from the source
literal (the suite already greps `service/index.js` this way at `:29`, `:51`,
`:59`):
- `PROMO_CAMPAIGN` exists and is not equal to `REWARD_CAMPAIGN` — two campaigns
  sharing a name silently merges the funnels.
- `_mailData`'s `free-month` branch routes `link` through `_promoCtaLink` — i.e.
  assert the raw `link: this.input.get("link")` form is *gone*, the same
  negative-assertion style as `:55-58`.

And behaviourally, rendering with a marked link must put it in the `href`:
```
render("free-month", { link: "https://x/#/desk?utm_campaign=launch30", ... })
  → includes 'href="https://x/#/desk?utm_campaign=launch30"'
```

**D2 — `claimed` conditional, both branches.** The existing call at `:96-99`
passes no `claimed` key, which after B1 renders the **offer** variant — so
`:102`'s `assert(free.includes("Sep 12, 2026"))` needs re-examining: the
unclaimed branch may not print `trial_ends` at all. Pin all three states
explicitly rather than leaving one implicit:

| Render | Assert |
|---|---|
| `{ claimed: 1, trial_ends: "Sep 12, 2026" }` | includes welcome copy + the date; excludes "Unlock My Free Month" |
| `{ claimed: 0 }` | includes offer copy + "Unlock My Free Month"; excludes "You've unlocked" |
| no `claimed` key | identical output to `claimed: 0` — pins the default and proves the `typeof` guard holds |

The third case is the one that catches a missing guard: without it the render
throws `ReferenceError` and the whole batch send fails.

Both branches must keep `free.includes("icons/free-month.png")` and
`!free.includes("icons/claim-reward.png")` (`:100-101`) — the hero is shared.

**D3 — desk routes are not covered here.** ui-team has no test runner in this
suite's reach, and the trigger change is timing- and DOM-dependent
(`onPartReady`, `Wm.launch`, a 5-minute `setTimeout`). See Verification.

---

## Sequencing

Each step leaves the tree coherent.

1. **`_campaignCtaLink` extraction** (analytics-server, A2 refactor half).
   Pure refactor, `_rewardCtaLink` behaviour identical. Ships alone so a
   regression in the live reward campaign is bisectable to one commit.
2. **`PROMO_CAMPAIGN` + `_promoCtaLink` + `_mailData` routing + comment
   replacement** (A1, A2, A3). **Must land with step 3.**
3. **Desk name-scoping + constant relocation to `libs/campaign.js`** (C1).
   **Must land with step 2** — see Pairing below.
4. **Desk force-open on arrival** (C2). Depends on 3.
5. **Template `claimed` conditional + `_mailData` passthrough** (B1, A4) and
   its tests (D2). Independent of 1-4; can go in parallel.
6. **Trigger timing** (C3). Fully independent of everything above — different
   method, different trigger, no shared state. Could ship first if the promo
   CTA work stalls on Open Question 1.
7. **Test additions** (D1) alongside step 2.

### Pairs that must land together

- **Steps 2 + 3.** Shipping 2 alone puts `utm_campaign=launch30` into live mail
  while desk still matches any campaign truthily — every recipient's click
  would post a bogus `reward.track status:"clicked"` and consume the marker.
  That is worse than the current state. Shipping 3 alone is harmless but inert.
  If they cannot ship together, **ship 3 first**.
- **B1 + A4.** The template branch and the `claimed` passthrough are one
  feature; a template reading a var nobody passes always renders the default,
  which looks like it works.
- **A3 + the comment deletion.** Non-negotiable: the comment currently asserts
  the exact opposite of what the code will do.

### Cross-repo ordering

analytics-server and ui-team deploy independently. The desk change (3) is
backward-compatible with unmarked mail — `campaignArrival()` returns `""` and
nothing fires. The mail change (2) is *not* backward-compatible with an
un-updated desk. **Deploy ui-team first.**

---

## Verification

Source-read only on this box. Nothing here can be runtime-verified:

- `yp.promo_launch30` exists in **no** local instance (`DESC promo_launch30` →
  `ERROR 1146 … doesn't exist`), so no promo state can be produced.
- `/srv/drumee/runtime/server` has no `promo.js` — this box has never run the
  feature.
- No MTA is exercised by the test suite; `_deliver` is not reachable from it.

What the test suite *does* cover without an instance: template rendering (real
lodash `template`, the same call `_deliver` makes), the registry contract, and
source-level assertions about `service/index.js`.

**Needs a real instance to confirm:**

1. That `captureCampaignArrival` survives the sign-in reload for the
   `launch30` marker specifically. It is designed to (sessionStorage,
   `campaign.js:97-102`) and does for `free-storage` today, but the promo CTA
   lands on `#/desk`, and whether the signed-out redirect preserves the hash is
   the failure mode worth watching.
2. That route (a) really is the only route reaching `:2414` on a genuine new
   signup — the guard reasoning above is read from source, and the four routes
   interact with a 2s timer, a 20s timer and part-ready ordering.
3. That force-opening for `eligible_seen` does not stack Modal A on the
   over-limit popup, which runs earlier in the same chain (`:2323`).
4. End-to-end: mail → click → Modal A → `promo.claim` → `org_provision` domain
   redirect. The redirect is the riskiest leg and has no local equivalent.

Suggested manual script on stage: send a `free-month` campaign to one seeded
Free account, click from a signed-out browser, confirm Modal A opens without
the 5-minute wait and that `reward.track` is **not** called (network tab).

---

## Known-adjacent, not fixed here

Two real server-side defects found during the trace. Both need `server-team` +
schema changes and are out of scope:

1. **The `ended` surface is never answerable.** `promo.js:108` whitelists only
   `home|billing|welcome`; `promo_launch30_mark_seen.sql` has no `ended`
   branch; `promo_launch30.sql` has no `ended_seen_at` column; `get_state`
   never returns `ended_seen`, which `desk:2247` tests. Modal C therefore
   re-shows on every home mount forever, and `_markEndedAnswered`'s `.catch`
   never fires because `SURFACE_INVALID` resolves normally.
2. **`claimed_expired` precedes the revert.** `promo.js:67` computes it from
   `trial_ends_at < now` on a still-`claimed` row, while `promoExpiryWorker`
   sweeps every 900s. For up to 15 minutes Modal C can say "You're on the Free
   plan now" while the org is still on Team.

Neither is touched by this plan, and neither blocks it.

---

## Open questions

1. ~~**Who sets `claimed`?**~~ **RESOLVED — option (b), derived from the
   template.** Per Correction 5 it can only ever be per-send, never
   per-recipient, because `_deliver` renders once per batch. Of the three
   options — (a) an explicit dashboard toggle, (b) derive it from the chosen
   template, (c) drop the conditional entirely — **(b)** is what shipped.

   `EMAIL_TEMPLATES` states which face each campaign renders (`claimed: 0` on
   free-month) and the picker reports it as a derived fact behind
   `data-disabled`; nothing on screen can flip it. The reasoning: the
   offer/welcome split is not a decision the sender makes. This campaign exists
   to make the offer — it is what the CTA in the mail opens, and what the trial
   list has not yet taken — while the welcome face belongs to a post-claim mail
   nothing here sends.

   Consequence, accepted deliberately: **`claimed: 1` is unreachable from the
   sender.** The template's claimed branch and `_mailData`'s passthrough both
   stay, so a welcome send is a config change rather than a rewrite, and D2's
   `claimed: 1` case keeps proving the branch works. `mail-templates.test.js`
   pins the derived value and says in a comment that the path is not live, so
   the case cannot later be mistaken for coverage of something reachable.

   An explicit toggle (option (a)) was built first and then removed — see the
   note on the analytics-ui file count in Scope.
2. **Does the subject line change for the offer variant?**
   `MAIL_TEMPLATES["free-month"].subject` is "Your free month of Drumee Team
   starts now" — welcome-shaped. If the mail now leads with an offer, the
   subject should probably follow, but `mail-templates.test.js:39-40` asserts
   subjects are unique across ids, so any change must stay distinct from the
   reward's.
3. **Campaign end date.** `CAMPAIGN_ENDS_AT` defaults to `1788091200` =
   2026-08-30 12:00 UTC (`server-team promo.js:31`), 16 days out.
   `_isEligible()` returns false past it, so every path built here goes inert
   on that date unless `PROMO_LAUNCH30_ENDS_AT` is moved. Not a blocker; a
   scheduling decision.
4. **Hero artwork** — see B3.

## Assumptions

- `"launch30"` as the campaign string. Nothing in any repo uses it today; it is
  free. Any value works provided the two constants match.
- The unclaimed branch reuses Modal A's existing copy rather than new copy, so
  the mail and the modal agree. New copy is a design decision, not a code one.
- The `_campaignCtaLink` extraction is acceptable. If touching live reward code
  is unwanted, `_promoCtaLink` can duplicate the ~14 lines instead — worse, but
  contained. Named as a recommendation, not a requirement.
- "New user" is operationalised as "first `_afterHomeSettled` of the session,
  reached via tutorial completion". There is no explicit account-age check, per
  the brief's instruction to use the existing code branch as the discriminator.
