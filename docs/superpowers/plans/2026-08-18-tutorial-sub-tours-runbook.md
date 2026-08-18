# Contextual sub-tours — verification runbook

**You do not need to have read the plan.** Everything needed is here.

This closes the manual gate on Phases 1 and 2, which have never run in a
browser. Budget ~90 minutes. Work top to bottom: the order is load-bearing.

Source checklists: `…-phase1-notes.md` and `…-phase2-notes.md`. Item labels
(`P1-4`, `P2-7`) are kept so a failure maps back to its phase and commit.

---

## 0. Read this before you start

**Every trigger is once per user, ever, and it is recorded on the server.** The
first qualifying click burns that tour's flag for the account permanently. A
tester who works the list in the wrong order will find later items simply do
nothing, and it will look like a bug.

Two consequences:

- **`?tutorial=<id>` also burns the flag.** It mounts the real tour, and a tour
  records itself when it mounts. So the "just look at it" renders are *not*
  free, and they are scheduled **after** the trigger items here, not before.
- **Several items compete for the same flag.** Six items need a fresh `share`;
  five need a fresh `folder`. Each such item carries an explicit
  **`RESET:`** line. Run it. It is one SQL statement (§2).

Set `$UID` once (§2) and keep it in a terminal beside the browser.

---

## 1. Setup

| # | Step | Fails loudly? |
|---|---|---|
| 1.1 | Apply the proc: `cd schemas && bin/patch-from-file yellow_page/procedures/entity/drumate_tutorial_seen.sql yellow_page` | **Silently.** Nothing errors at boot; the trigger fires, the tour runs, and the write 500s in the network panel. Verify with 1.2. |
| 1.2 | `mysql -e "SHOW PROCEDURE STATUS WHERE Db='yp' AND Name='drumate_tutorial_seen'\G"` — expect one row | — |
| 1.3 | Add `"contextual_tours": 1` to `/etc/drumee/conf.d/myDrumee.json`, restart the server | **Silently.** With it absent every trigger no-ops and the desk behaves exactly as it does today — which is indistinguishable from "the feature is broken". Verify with 1.4. |
| 1.4 | In the browser console: `Platform.get("contextual_tours")` → `1` | — |
| 1.5 | Deploy the client build containing the branch | Loudly (stale bundle → `Tours is not defined` in console, or no new behaviour at all). Confirm with `typeof require` is not available in prod builds — instead check 1.6. |
| 1.6 | Console: `location.hash = "#/desk?tutorial=migrate"` then reload → the tour appears | If nothing appears, the bundle is stale. Stop here. |
| 1.7 | Sign in as a **normal, non-devel** account first. You will switch to a devel account only for P1-9. | — |
| 1.8 | Make sure the account has: a **share-area workspace** (External), containing a **doc file** (`.docx`/`.pdf`), and at least one **sub-folder** | Silently: the share icon (P2-4) only renders for a share-area workspace **root**, and the kebab Share item (P2-6) only for a regular file in a share area. Missing either makes the item unreachable, not failing. |
| 1.9 | Open that workspace once so a **folder window** exists with a **Tasks** tab | — |

**URL form.** The hash is split on `#`, `/`, `&`, `?` and read as `k=v` pairs, so
all of these are equivalent: `#/desk?tutorial=migrate`, `#/desk/tutorial=migrate`.
Use `#/desk?tutorial=migrate`. Changing the hash alone is not always enough —
**reload** after setting it.

---

## 2. State: read, reset, and the one-tour reset

```bash
# Find the account's entity id once, then keep it.
UID=$(mysql -N -e "SELECT id FROM yp.drumate WHERE email='you@example.com'")
echo "$UID"
```

**Read the seen-map** (the only trustworthy check — never judge by the UI):

```bash
mysql -t -e "SELECT JSON_EXTRACT(settings,'\$.tutorials_seen') AS seen
             FROM yp.entity WHERE id='$UID'"
```

Expected before you start: `NULL` (the key does not exist yet). A real row will
already have other keys such as `wallpaper` — that is normal and is exactly the
case the write has to preserve.

**Reset ONE tour** — the workhorse of this runbook:

```bash
mysql -e "UPDATE yp.entity
          SET settings = JSON_REMOVE(settings, '\$.tutorials_seen.\"folder\"')
          WHERE id='$UID'"
```

Substitute `folder` / `share` / `task` / `migrate` / `workspace`. Reload the
browser afterwards — the client reads the map from the boot payload, so a reset
does not take effect until the page reloads.

**Reset everything:**

```bash
mysql -e "UPDATE yp.entity
          SET settings = JSON_REMOVE(JSON_SET(settings,'\$.tutorials_seen',JSON_OBJECT()),'\$.tutorial_done')
          WHERE id='$UID'"
```

**Also clear the browser mirror** whenever you reset, or the client keeps
suppressing locally:

```js
localStorage.removeItem("drumee.tutorials_seen")
```

**`?tutorial=reset`** does both server and client sides in one go, but **only
for an account whose `profile.devel` is set** — the server re-checks and refuses
otherwise. That is P1-9's subject; until then use the SQL.

---

## 3. Items

Three blocks. Do not reorder them.

### Block A — triggers (flag ON, virgin state)

> These need unburned flags. Everything here comes first.

---

**A1 · `P1-7` · "+ New" fires `migrate`**
**RESET:** `migrate`
Click **+ New** in the desk topbar.
**Expect:** the dropdown opens normally **and** the migrate tour appears over
the desk. Badge **STEP 1/3**. Press Escape or reload to dismiss.
Now force a topbar rebuild — change your privilege in the current workspace, or
toggle over-limit — and click **+ New** again.
**Expect:** menu opens, **no tour**.
**If it fires twice:** the seen-set did not record (check A2 first) or the
trigger kept state on the DOM node. → commit `5e233f6c`, `case "addmenu"`.

---

**A2 · `P1-10` + `P2-10` · the record actually reached the server**
*(these two items were identical in kind and are merged)*
Run the read from §2.
**Expect:** `{"migrate": 1787…}` — a **number**, not `"1787…"` in quotes, and
any pre-existing keys such as `wallpaper` still present alongside.
**If the value is a quoted string:** the proc is using a `DECLARE`d variable
instead of an inlined `UNIX_TIMESTAMP()`. → commit `d3caad8`.
**If `wallpaper` vanished:** the write is going through `update_settings`
instead of the new proc. → commit `c54740a`.
**If nothing is there but the tour ran:** check the network panel for
`drumate.tutorial_seen`; a 404 means step 1.1 was skipped.

---

**A3 · `P1-5` · a workspace tile fires `folder`; a file tile does not**
**RESET:** `folder`
From the desk home grid, click a **workspace** tile.
**Expect:** the workspace opens **and** the folder tour appears. Badge
**STEP 1/3**. Dismiss.
Click the same tile again. **Expect: no tour.** Reload, click again: **still no
tour.**
Now reset `folder`, reload, and click a **file** tile.
**Expect: no tour** (files are not folders), and the file opens.
**If the workspace does not open:** the trigger is pre-empting the action. →
commit `5e233f6c`, `case "open-node"`.

---

**A4 · `P1-8` · a tile click that also opens a folder window fires exactly one tour**
**RESET:** `folder`
Click a workspace tile that opens a folder window carrying a share icon.
**Expect:** exactly **one** tour on screen.
**If two:** single-flight. → `libs/tutorial-tours.js`, `_inFlight`.

---

**A5 · `P1-6` · the sidebar fires `folder` too**
**RESET:** `folder`
Click a **workspace row** in the sidebar. **Expect:** it opens **and** the
folder tour runs. Dismiss.
**RESET:** `folder` again.
Click a **sub-folder row** in the sidebar. **Expect:** the folder window opens
**and** the tour runs.
*(Both rows share one flag, which is why this needs two resets — it is not a
bug.)*

---

**A6 · `P2-8` · the Tasks tab fires `task`**
**RESET:** `task`
In a folder window, click the **Tasks** tab.
**Expect:** the tab opens **and** the tracker tour appears. Badge **STEP 1/5**.
Dismiss, click Tasks again: **no tour**.

---

**A7 · `P2-4` · Manage access fires `share`, and closing does not**
**RESET:** `share`
Open the **share-area workspace root** window. Click the **share icon** in its
topbar.
**Expect:** the Manage-access drawer opens **and** the share tour runs. Dismiss
the tour.
Click the share icon **again**.
**Expect:** the drawer **closes**, and **no tour** (correct on two counts — the
flag is burned, and a closing click never counts).
**If the tour fires on the closing click and not the opening one:** the flag is
being read after `openManageAccess()` toggles it. → commit `0f08471f`.

---

**A8 · `P2-5` · the overflow menu behaves identically**
**RESET:** `share`
Narrow the folder window until the topbar collapses into the **⋮ overflow
menu**. Choose **Manage access**.
**Expect:** identical to A7 — drawer opens, tour runs.
**If this one does nothing while A7 works:** the trigger was put at a call site
instead of in the handler. → commit `0f08471f`.

---

**A9 · `P2-6` · the two share entries share one flag, in both orders**
**RESET:** `share`
Click the kebab (⋮) on a **doc file** in the share-area folder → **Share**.
**Expect:** the share panel appears **and** the tour runs. Dismiss.
Now click the topbar **share icon**. **Expect: no tour** (the drawer still
opens).
**RESET:** `share`. Reload.
Reverse it: topbar share icon first (tour runs), then kebab **Share**
(**no tour**, panel still appears).
**If the second entry fires:** the two are not sharing a flag. → check both
sites pass the literal `"share"`.

---

**A10 · `P2-7` · the kebab still works when the drawer host is unavailable**
**RESET:** `share`
Trigger the fallback path: use the kebab **Share** from a surface with no
`wrapper-dialog` host — e.g. from the desk home grid rather than inside a folder
window.
**Expect:** a **floating** `window_secure_share` opens **and** the tour still
runs once.
**If the panel opens but no tour:** the fire was placed inside one branch of the
latch instead of ahead of it. → commit `d62ddbde`.

---

**A11 · `P2-9` · single-flight across trees**
**RESET:** `folder` **and** `share`
Click a workspace tile so the `folder` tour is on screen. **While it is up**,
click a share control.
**Expect:** still exactly **one** tour (the folder one). Dismiss it, then click
the share control again.
**Expect:** the share tour now runs — it must **not** have been silently marked
seen while it was blocked.
**If the share tour never comes back:** it was marked seen while suppressed —
the most costly failure in the set, because the user loses a tour they never
saw. → `libs/tutorial-tours.js`, `fire()` must not call `markSeen`.

---

### Block B — standalone renders (these burn their flags; nothing after needs them)

---

**B1 · `P1-1` · `#/desk?tutorial=migrate`**
**Expect:** badges **STEP 1/3 → 2/3 → 3/3** — *never* "1/1". Back **hidden** on
screen 1, present on 2 and 3. Forward button reads **Done** on screen 3.
The Google-Drive menu lands under the shell's Add-new button.
**If any screen reads "STEP 1/1":** the registry badge mode. → commit `57bbdba1`.
**If Back shows on screen 1:** `is_first` is not reaching the widget.

---

**B2 · `P1-2` · `#/desk?tutorial=folder`**
**Expect:** **1/3 → 3/3**, Back hidden on screen 1, **Done** on screen 3, and all
three spotlights land: the `/bg_concept.png` chip (a wide hole, not one clamped
to the chip), the thread panel with the callout on the Drumee_Strategy_Q2 card,
the files panel with the callout on the "Chat thread" row.

---

**B3 · `P2-1` · `#/desk?tutorial=task`**
**Expect:** **1/5 → 2/5 → 3/5 → 4/5 → 5/5**, Back hidden on view 1, **Done** on
Project Health. In **every** view the five-view switcher bar stays fully
readable inside the lit area — that is a measured radius, so check all five.
Backdrop: the faded workspace grid behind the window.

---

**B4 · `P2-2` · `#/desk?tutorial=share`**
**Expect:** **1/3 → 3/3**, Back hidden on screen 1, **Done** on the link screen.
On each screen the panel scrolls so that screen's block sits at the **top**, and
the whole panel is lit — not a block half off the bottom.

---

**B5 · `P1-3` + `P2-3` · `#/desk?tutorial=1` — the regression check**
*(the two lists carried this item separately; P2's stricter wording supersedes,
and P1's extra sub-checks are folded in)*
**Do not press Done on the last screen** unless you are ready to reset
everything — finishing the full tour marks **all five** tours seen.
**Expect:** the six-step tour, unchanged. **STEP 1/6 → 6/6**, meeting at **3/6**,
Back live from step 2 onward, Done only on migrate's final screen.
Four of six badges are now derived rather than hardcoded (folder 2/6, task 4/6,
share 5/6, migrate 6/6) — this item is the check that they still read exactly
what they read before.
Also confirm here: backdrop composition per step, and the layout at tablet width
(768–1024px).
**If any step's number changed:** → commit `57bbdba1` / `f776f650`, the C5 edits.

---

### Block C — flag off, and reset

---

**C1 · `P1-4` · kill switch off is byte-for-byte today's behaviour**
Set `"contextual_tours": 0` (or remove the key), restart, reload.
Open the network panel and filter on `tutorial_seen`.
Walk a full signup-style path: run `#/desk?tutorial=1` and **finish it**,
including Done. Click **+ New**, click a workspace tile.
**Expect:** the six-step tour behaves exactly as before, no contextual tour ever
appears, and **zero** `drumate.tutorial_seen` requests — including after Done.
**If requests appear:** `markSeen` is missing its kill-switch early return. →
commit `5e233f6c`.
Turn the flag back on before C2.

---

**C2 · `P1-9` · `?tutorial=reset`**
As a **non-devel** account: `#/desk?tutorial=reset`, reload.
**Expect:** the request is **refused** by the server and the map is **intact**
(check with §2's read).
Switch to an account with `profile.devel` set. Same URL.
**Expect:** the map is emptied, `tutorial_done` dropped, and every tour becomes
triggerable again. No tour mounts from this URL.

---

### Block D — Phase 3, the signup path

> **Only if the Phase 3 branch is in the build.** Phases 1 and 2 can merge
> without it; these items gate `feat/contextual-sub-tours-phase3`.
>
> Every item needs a **brand-new account** — you cannot re-run a signup. Budget
> one throwaway account per item, or reset `workspace` and re-enter onboarding
> with `localStorage.setItem("force-onboarding", 1)` plus clearing
> `profile.onboarded` server-side.

---

**D1 · a real signup, all the way through**
Sign up, complete onboarding to the end.
**Expect:** the desk paints, then ~2s later the **workspace** tour appears —
badge **STEP 1/3 → 3/3**, Back hidden on badge 1, **Done** on badge 3. Press
Done.
**Then, in order:** the reward flow appears; LAUNCH30 follows **without** its
five-minute hold; the invited-workspace prompt comes last if one is armed.
**If the tour appears but nothing follows it:** the chain gate is rejecting
`workspace`. → commit `5e233f6c`, `case "desk-tutorial"`.
**If the tour never appears but the chain runs at 2s:** `fire()` declined —
check the seen-map (§2); a previous run on this account burned it.

---

**D2 · the chunk blocked**
New account. Before finishing onboarding, block the tutorial chunk in devtools
(Network → block request URL for the `desk_tutorial` chunk).
**Expect:** no tour, and home settles after the **20s** net — reward flow and
the rest still run, ~20s late, with `[home] tutorial never mounted` in console.
**If home never settles:** the net was disarmed for a launched tour. → commit
`61f3cbd9`.

---

**D3 · onboarding closed rather than completed**
New account. Start onboarding, then **close/reset** it rather than finishing.
**Expect:** no tour at all; home settles at **2s**; and the seen-map now
contains **`workspace`** (§2 read).
**Then reload.** If the wizard reappears — it can, because that path writes
`onboarded` locally only — **still no tour**.
**If `workspace` is absent from the map:** the skip path is not marking. →
commit `dadfb123`.

---

**D4 · the onboarding plugin fails to load**
New account, block the onboarding plugin's request.
**Expect:** no wizard, no tour, home settles. Nothing is written.

---

**D5 · a mobile signup — the reason this phase has a fix at all**
New account, on a **real mobile viewport** (a phone, or devtools device
emulation — `Visitor.isMobile()` must actually be true; a narrow desktop window
is not enough).
Complete onboarding.
**Expect:** **no tour** (D9 gates mobile) **and home settles at ~2 seconds** —
reward flow and the rest run promptly.
**Time it.** If they appear ~20 seconds after onboarding instead, this is the
exact defect Phase 3 exists to fix and the branch is not in the build. → commit
`61f3cbd9`.
**Also check:** the seen-map has **no** `workspace` entry — mobile must not burn
the flag, so the same account gets the tour on its first desktop session.

---

**D6 · `?tutorial=1` after Phase 3**
Five of six steps are now derived (only `meeting` is hardcoded).
**Expect:** identical to B5 — **1/6 → 6/6**, meeting at 3/6.

---

## 4. Triage

| Symptom | Most likely cause | Commit / file |
|---|---|---|
| No tour ever fires, anywhere | Kill switch off, or the S4 three-state read treating an **absent** map as "all seen" | 1.3/1.4; `libs/tutorial-tours.js` `serverState()` |
| A tour fires every time | The write never lands (proc missing → 404), or the mirror is being cleared | 1.1; `markSeen()`; network panel |
| A tour fires twice in one session | Single-flight, or a trigger site keeping its own state | `_inFlight`; `case "addmenu"` (`5e233f6c`) |
| Two tours on screen at once | Single-flight, or the guard timer expiring mid-read | `_inFlight` / `armed()` |
| A tour never comes back after being blocked | `fire()` marking seen — it must not | `343d62e5` |
| `?tutorial=1` badge numbers changed | The derived badge does not match the string it replaced | `57bbdba1`, `f776f650` |
| Any badge reads "STEP 1/1" | Badge mode inferred instead of declared | `tours.js`, `badge:` field |
| Back visible on the first screen of a standalone tour | `is_first` not stamped or not read | `_buildWidgets` (`57bbdba1`) |
| Done missing on a standalone tour's last screen | `is_last` / `isLastScreen` | `57bbdba1` |
| The share tour fires on closing the drawer, not opening | `isShowSettings` read after the toggle | `0f08471f` |
| A trigger works from one entry point but not its twin | Trigger placed at a call site, not in the handler | `0f08471f` |
| The underlying action stops working (workspace won't open) | Trigger raised before the action | `5e233f6c`, `case "open-node"` |
| Timestamps are quoted strings in the DB | `DECLARE`d variable through `JSON_OBJECT` | `d3caad8` |
| Other `settings` keys disappear on write | Write going through `update_settings` | `c54740a` |
| Requests fire with the switch off | `markSeen` missing its early return | `5e233f6c` |
| Reward flow / LAUNCH30 arrive ~20s after signup | A gated post-signup tour left the 20s net as the only route home | `61f3cbd9` |
| The workspace tour never runs for a new signup | Its flag was burned by an earlier run or by `?tutorial=workspace` | §2 read, then reset `workspace` |
| The wizard reappears AND the tour with it | The skip path is not marking `workspace` | `dadfb123` |

---

## 5. Sign-off

Blocks A–C must pass before Phases 1 and 2 merge. Block D gates Phase 3 and
can be run separately, on its own branch.

```
Runbook:      2026-08-18-tutorial-sub-tours-runbook.md
Run by:       ______________________   Date: ____________
Build / SHA:  ______________________   Host: ____________
contextual_tours: [ ] on for A/B   [ ] off verified in C1
Proc applied to: ______________________ (schema)

Block A  A1 [ ]  A2 [ ]  A3 [ ]  A4 [ ]  A5 [ ]  A6 [ ]
         A7 [ ]  A8 [ ]  A9 [ ]  A10 [ ] A11 [ ]
Block B  B1 [ ]  B2 [ ]  B3 [ ]  B4 [ ]  B5 [ ]
Block C  C1 [ ]  C2 [ ]
Block D  (phase 3 only)
         D1 [ ]  D2 [ ]  D3 [ ]  D4 [ ]  D5 [ ]  D6 [ ]

Failures / notes:
________________________________________________________
________________________________________________________

Gate closed:  [ ] yes    [ ] no — blocking items: ______
```

---

## Reconciliation note

The two source lists held 20 items; this runbook has 18. Nothing was dropped —
two pairs were duplicates:

- **`P1-3` and `P2-3`** were both `?tutorial=1`. Merged into **B5**, keeping
  P2's stricter wording (four derived badges) and P1's extra sub-checks
  (backdrop composition, tablet width).
- **`P1-10` and `P2-10`** were both "read `entity.settings` directly rather than
  trusting the UI", differing only in which tour. Merged into **A2** and
  positioned after the first trigger, where there is a record to read.

Everything else maps 1:1 and keeps its original label.
