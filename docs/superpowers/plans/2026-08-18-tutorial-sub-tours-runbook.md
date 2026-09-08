# Contextual sub-tours — verification runbook

**You do not need to have read the plan.** Everything needed is here.

This closes the manual gate on Phases 1 and 2, which have never run in a
browser. Budget ~90 minutes. Work top to bottom: the order is load-bearing.

Source checklists are folded into `…-phases.md`. Item labels
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
| 1.5 | Deploy the client build containing the branch | **Silently.** A stale bundle produces no error — the desk simply behaves as it always has, and then *every* item below fails identically for one reason that has nothing to do with them. There is no console check worth trusting here; the bundle is verified by 1.6 and only by 1.6. |
| 1.6 | **Bundle check.** Set `location.hash = "#/desk?tutorial=migrate"` and **reload**. A tour must appear within ~2s. | **This is the gate.** If no tour appears, the build does not contain the branch (or 1.3 was missed — but `?tutorial=` is not gated by the switch, so a missing tour here means a stale bundle). **Stop and fix the deploy before going further.** Everything below assumes this passed. |
| 1.6b | **While that tour is still on screen**, run the diagnostic in §1.6b below and paste the output into the sign-off box. | Answers OQ6 in the same ten seconds. Do not skip it — this is the only moment anyone has a running tour and the question in front of them at once. |
| 1.7 | Sign in as a **normal, non-devel** account first. You will switch to a devel account only for P1-9. | — |
| 1.8 | Make sure the account has: a **share-area workspace** (External), containing a **doc file** (`.docx`/`.pdf`), and at least one **sub-folder** | Silently: the share icon (P2-4) only renders for a share-area workspace **root**, and the kebab Share item (P2-6) only for a regular file in a share area. Missing either makes the item unreachable, not failing. |
| 1.9 | Open that workspace once so a **folder window** exists with a **Tasks** tab | — |

### 1.6b — the OQ6 diagnostic

Static analysis reached a contradiction and stopped: five separate checks say a
desktop tutorial mounted into `.desk-module__overlay` should be **invisible**
(`opacity: 0` with no conditional wrapper and no code writing `data-state="open"`
outside the mobile drawer), and it plainly is not. Something about where the
tutorial actually lands in the DOM differs from every static reading. Nobody can
close that question without a running tour — and you have one on screen right now.

**With the tour from 1.6 still up, paste this into the console and copy what it
prints.** One paste, no navigation.

```js
(() => {
  const root = document.querySelector('.tutorial-main__ui');
  if (!root) return 'NO TUTORIAL ROOT — is a tour actually on screen?';
  const L = [];
  const desc = (e) => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') +
    (e.classList.length ? '.' + [...e.classList].join('.') : '') +
    (Object.keys(e.dataset).length ? ' ' + JSON.stringify({ ...e.dataset }) : '');

  L.push('== ancestor chain, tutorial root -> body ==');
  for (let el = root, i = 0; el && el !== document.documentElement; el = el.parentElement, i++) {
    const c = getComputedStyle(el);
    L.push(`[${i}] ${desc(el)}`);
    L.push(`     opacity=${c.opacity} pointer-events=${c.pointerEvents} display=${c.display} visibility=${c.visibility} position=${c.position} z=${c.zIndex}`);
  }

  L.push('== which overlay rules match ==');
  const ov = root.closest('.desk-module__overlay');
  if (!ov) L.push('  tutorial root is NOT inside .desk-module__overlay  <-- this alone would explain everything');
  else ['[data-state="open"]', '[data-device="mobile"]', ':not([data-device="mobile"])']
    .forEach((sel) => L.push(`  .desk-module__overlay${sel} : ${ov.matches('.desk-module__overlay' + sel)}`));

  L.push('== hit test ==');
  const at = (x, y) => { const e = document.elementFromPoint(x, y); return e ? desc(e) : 'null'; };
  const spot = document.querySelector('.tutorial-spotlight__ui');
  const cs = spot && getComputedStyle(spot);
  const hx = cs && parseFloat(cs.getPropertyValue('--spot-x'));
  const hy = cs && parseFloat(cs.getPropertyValue('--spot-y'));
  L.push(`  inside the spotlight hole (${hx}, ${hy}): ${Number.isFinite(hx) ? at(hx, hy) : 'no spotlight'}`);
  L.push(`  outside it (8, ${innerHeight - 8}): ${at(8, innerHeight - 8)}`);
  L.push(`  viewport ${innerWidth}x${innerHeight}, device=${document.body.dataset.device || '?'}`);
  return L.join('\n');
})()
```

*(Browsers do not expose matched CSS rules to page script, so the middle block
tests the selectors directly instead — same answer, no devtools protocol.)*

**Expected shape** — the interesting part is where `opacity` stops being `1`:

```
== ancestor chain, tutorial root -> body ==
[0] div.tutorial.tutorial-main.tutorial__ui.tutorial-main__ui {"device":"desktop"}
     opacity=1 pointer-events=none display=flex visibility=visible position=static z=auto
[1] div.desk-module__overlay.dialog__wrapper {"device":"desktop"}
     opacity=0 pointer-events=none display=flex visibility=visible position=absolute z=10010
...
```

**How to read it, and where it goes:**

| What you see | What it means |
|---|---|
| An ancestor with `opacity=0` | The static reading was right and something else explains visibility — capture the whole chain, it is the answer. |
| **No** ancestor with `opacity=0` | The tour does not live where the plan thinks. Look at `[1]` and at the "which overlay rules match" block: either the root is not inside `.desk-module__overlay`, or `[data-state="open"]` is true and something writes it. |
| `pointer-events` is `none` all the way up | Clicks pass through to the real desk → **A11b-passthrough**. |
| Any ancestor with `pointer-events: auto` | The overlay swallows clicks → **A11b-swallowed**, and the cross-tree collision cannot occur in the product. |
| "inside the spotlight hole" returns a real desk element | Same conclusion as passthrough, measured directly. |

**Record it:** paste the full output into the sign-off box at the end of this
runbook, under "1.6b diagnostic". That is where OQ6 gets closed from — a paste in
a chat window is not a place the plan can be updated from.

**This supersedes A11a.** If 1.6b's hit test answers the pointer-events question —
and it should — A11a is redundant; go straight to whichever A11b branch it
indicates.

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

**Check the SHAPE, not just the presence.** Once a tour has run, the value must
be an **unquoted number**:

```
{"migrate": 1787093945}      ✅
{"migrate": "1787093945"}    ❌  regression
```

A quoted value means the procedure has gone back to reading `UNIX_TIMESTAMP()`
from a `DECLARE`d variable, which MariaDB stringifies on the way through
`JSON_OBJECT` (plan §4 S1). Nothing in the UI will show it: every presence check
here passes on a string, and so does the client's `isSeen()`. It only surfaces
later, when something compares or sorts the values. Check it every time you read
the map.

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

**A1b · "+ New" inside a folder window fires `migrate` too, and only once**
**RESET:** `migrate`
Open a folder window, then click **+ New** in its topbar
(`window-folder-topbar__new-ctrl`) — *without* touching the desk topbar first.
**Expect:** the dropdown opens normally **and** the migrate tour appears.
Badge **STEP 1/3**.
Now dismiss it and click the **desk topbar's** + New.
**Expect:** menu opens, **no tour** — the two entry points share the `migrate`
flag, so the first one pressed burns it for both.
Repeat the whole item in the other order (desk first, then the folder window)
and expect the same: exactly one tour across the two surfaces.
**If both fire:** the flag is not shared — one of the two call sites is passing
a tour id other than `migrate`, or `Tours.fire` is being bypassed.
**If the folder one never fires:** the `new-menu` part is not registered —
check `sys_pn: "new-menu"` in `builtins/window/skeleton/toolkit/index.js`
`fileNewControl`. Note the control is hidden for viewers who cannot write, so
test as a user with write privilege.

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

> **A11a decides whether A11b is performable at all.** A tour renders a full
> mock desk over the real one. Whether a click reaches the real desk underneath
> could not be settled from the source: the spotlight's own layers are all
> `pointer-events: none` and pass clicks through, but the layer they sit in
> (`.desk-module__overlay`) computes `opacity: 0; pointer-events: none` in
> isolation — which would make the tour invisible, so something in the running
> app differs from that reading. **Ten seconds with the app answers it.**
> Please record the answer in the notes box at sign-off; it feeds back into the
> plan.

**A11a — which world are we in?** (do this first, it costs nothing)
Click a workspace tile so the `folder` tour is on screen. Now click somewhere
the **real** desk has a control but the **mock** desk does not — e.g. the real
sidebar's Trash entry, or a real workspace tile at a position the mock grid
leaves empty.
- **Nothing happens** → the overlay swallows clicks. Go to **A11b-swallowed**.
- **The real desk reacts** (panel opens behind the tour, breadcrumb changes) →
  clicks pass through. Go to **A11b-passthrough**.

**A11b-swallowed.** The cross-tree collision cannot be produced by clicking:
while any tour is up, no share control is reachable. **Skip the rest of A11 and
mark it N/A**, noting "swallowed" at sign-off. The automated test
(`tests/tutorial-tours-share.test.js`, "a share click during a running folder
tour…") is then the entire coverage for this behaviour, which is fine — it
exercises the same two assertions directly against the module.

**A11b-passthrough.** Perform it, and note the exact route you used:
the lit element during the `folder` tour is a mock file panel, **not** a share
control, so you must click through to a real one — the share icon on a folder
window that was already open behind the tour is the usual route.
**Expect:** still exactly **one** tour (the folder one). Dismiss it, then click
the share control again.
**Expect:** the share tour now runs — it must **not** have been silently marked
seen while it was blocked. Confirm with the §2 read: `share` must be **absent**
from the map until the tour actually appears.
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
**All six badges are now derived** — nothing in any step file hardcodes a step
number any more. This item is therefore the only thing standing behind six
separate edits made across four phases, and it is the check that every one of
them still reads exactly what it read before. Read all six, out loud if it
helps: 1/6 workspace, 2/6 folder, 3/6 meeting, 4/6 task, 5/6 share, 6/6 migrate.
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
**Expect:** identical to B5 — **1/6 → 6/6**, meeting at 3/6. (After Phase 5a
every badge is derived; B5 is the fuller version of this check.)

---

### Block E — Phase 4, the skip control

> Only if the Phase 4 branch is in the build. Every item needs an unburned flag
> or a `?tutorial=<id>` render; the renders are fine here because Block B has
> already run.

---

**E1 · the control is visible and legible on every tour**
Run `#/desk?tutorial=migrate`, `=folder`, `=task`, `=share`, and `=1`.
**Expect:** on **every** screen of every tour, an **✕** at the top-right of the
callout card, level with the STEP pill. Hovering it shows "Skip tour" (localised).
It is present on screen 1, where **Back is hidden** — the two are independent.
Repeat at **tablet width (768–1024px)**: the ✕ must not collide with the pill or
overflow the card.
**If it is missing on screen 1 only:** it was wired to the `hide_back` branch. →
commit `542497b8`, `tooltip.js`.

---

**E2 · Escape does the same thing**
With any tour on screen, press **Escape**.
**Expect:** the tour fades out, identically to clicking ✕.
Now press Escape with **no** tour on screen.
**Expect:** whatever the desk normally does — the tour's binding must not have
survived its own teardown.
**If Escape stops working elsewhere in the app after a tour:** the hotkey was not
unregistered. → `onBeforeDestroy` in `tutorial/index.js`.

---

**E3 · skipping a contextual tour records nothing extra**
**RESET:** `migrate`. Reload.
Click **+ New** so the `migrate` tour appears, then **skip it on screen 1**.
**Expect:** it closes. Read the map (§2): `migrate` **is** present — it was
recorded when it mounted, not when it ended. Click **+ New** again: **no tour**.
**Also:** `settings` must **not** have gained `tutorial_done` (§2 read, look at
the whole blob). Skipping a three-screen tour must never write that.

---

**E4 · skipping `full` leaves the contextual tours armed** — the one that matters
**RESET: everything** (§2), reload, and confirm the map reads `NULL` or `{}`.
Run `#/desk?tutorial=1` and **skip on step 1**.
**Expect, from the §2 read and NOT from the UI:** `tutorials_seen` is still
empty, and `tutorial_done` is **absent**.
Then click **+ New**.
**Expect:** the `migrate` tour runs — the user skipped the full tour, so they
have not seen it.
**If the map came back with all five ids, or the + New click does nothing:**
skip was routed through `_enterWorkspace()`. → commit `542497b8`.

---

**E5 · Done still behaves as before**
Run `#/desk?tutorial=1` and **finish it**, pressing Done on the last screen.
**Expect:** the map now holds **all five** ids, and `tutorial_done` is `true`.
This is the contrast to E4 and the regression cover for S7.

---

**E6 · the reward chain still follows a skipped tour**
On a fresh signup (as in D1), let the `workspace` tour appear and **skip** it.
**Expect:** the reward flow, LAUNCH30 and the invited-workspace prompt still
follow, exactly as they do after Done — they chain on `destroy`, which skip
reaches by the same `softDestroy()`.

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
| Skipping any tour writes `tutorial_done`, or skipping `full` marks all five | `end-tour` routed through the Done path | `542497b8` |
| The ✕ is missing on screen 1 only | It was wired to the `hide_back` branch | `542497b8`, `tooltip.js` |
| Escape stops working elsewhere after a tour | The capture hotkey was not unregistered | `onBeforeDestroy` |

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
Block E  (phase 4 only)
         E1 [ ]  E2 [ ]  E3 [ ]  E4 [ ]  E5 [ ]  E6 [ ]

1.6b diagnostic output (REQUIRED — this is what closes OQ6):
________________________________________________________
________________________________________________________
________________________________________________________

A11a result (skip if 1.6b already answered it):
  [ ] overlay SWALLOWS clicks (A11 marked N/A)
  [ ] clicks PASS THROUGH (A11b performed; route used: __________)

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
