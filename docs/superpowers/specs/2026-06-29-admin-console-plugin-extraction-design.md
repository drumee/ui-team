# Admin Console → Plugin Extraction (Design)

**Date:** 2026-06-29
**Status:** Approved scope/decisions — ready for implementation plan(s)
**Spans:** ui-team (FE monolith), server-team (BE monolith), schemas (shared procs — unchanged), + 2 NEW code units `@drumee/admin-console` (FE), `@drumee/admin-api` (BE).
**Repo workflow (per user):** build both as **plain folders first** — `/Volumes/Data/drumee/admin-console` and `/Volumes/Data/drumee/admin-api` (siblings to `loby`/`signin`), NO `git init`/remote during implementation. The standalone git repos are created only **after** implementation is complete and verified. Until then they are local folders developed against the live monolith.

## Goal

Extract the Drumee **admin console** out of the two monoliths into standalone plugins, mirroring the
existing split: BE plugin like `loby`, FE plugin like `signin`/`signup`. A standing requirement:
**every config parameter the monolith used to guarantee must get an explicit default when the
extracted code can no longer rely on the host supplying it.**

## Approved decisions (from brainstorming)

1. **BE schema ownership:** the 40+ shared `yellow_page` procedures (drumate/organisation/domain/
   role/member/mimic/quota) **stay in the `schemas` repo**. The BE plugin only relocates the
   *service layer* and **keeps calling** those procs. It does NOT fork/copy core procedures
   (forking risks version-skew + core-data corruption).
2. **One spec, two implementation plans** (FE plugin, BE plugin) — they are independent and can ship
   in either order (the endpoint/routes are preserved during migration).
3. **Legacy `builtins/panel/admin/` is dead** (verified: nothing launches `admin_main`/its kinds, no
   cross-import with the active window, and its `module_admin` route target is registered nowhere).
   Excluded from the plugins; deleted in the cleanup step.
4. **FE model = content-plugin (Option A):** the thin window *shell* stays in the monolith; the
   *content* (pages + widgets) becomes the plugin.
5. **BE shared libs:** copy the needed libs into the plugin (loby-style).
6. **Names:** FE `@drumee/admin-console`, BE `@drumee/admin-api`.

## Current state (from investigation)

### FE (ui-team)
- Active admin = `src/drumee/builtins/window/adminpanel/` (~76 JS files ~8.2k LOC + ~3.5k SCSS):
  - **Shell:** `___window_admin_panel extends __window_interact_singleton` (`adminpanel/index.js`, ~373 LOC) — the Wm-managed singleton window frame.
  - **Pages (all `extends LetcBox`):** `members` (`pages/members`), `members/room`, `domain-page`, `broadcast-message`, `admin-security`.
  - **Widgets (12, all `extends LetcBox`):** `members_list`, `members-list-item`, `members-search`, `member_detail`, `member_form`, `member_tags`, `member_tag_item`, `member-choose-admins`, `member-who-can-see`, `member-roles-menu`, `member-roles-menu-items`, `dropdown-menu`.
- Opened via kind `window_adminpanel` from: `builtins/widget/settings/account/index.js:125`, `builtins/skeleton/toolkit/user.js:32`, `modules/desk/skeleton/common/topbar/dropdown.js:25`. Also `builtins/widget/settings/organization/admin/index.js:280` launches the `admin_security_page` kind.
- 100% lazy-loaded via `src/drumee/seeds.js`. Calls 28 `SERVICE.adminpanel.*` endpoints. Uses ~192 LOCALE keys.
- **Monolith-only deps the moving code touches:** `builtins/skeleton/toolkit` (button/confirm_buttons helpers), `@drumee/ui-essentials`, `@drumee/ui-toolkit/templates/progress`. (The window-frame deps — `window/interact/singleton`, `window/skeleton/content/main`, `window/skeleton/topbar/control` — belong to the SHELL, which stays in the monolith.)

### BE (server-team)
- `service/private/admin.js` (`__admin extends Entity`, 31 services) + `service/private/adminpanel.js` (`__private_adminpanel extends Mfs`, 44 services).
- `acl/admin.json` (31) + `acl/adminpanel.json` (44).
- Calls 40+ shared `yellow_page` procs; shared libs `service/lib/{env.js (createHub), stripe.js, email-policy.js, secure-share-*}`; `Cache.getSysConf(...)`.

### Reference patterns
- **FE (signin/signup):** `@drumee/x`, `main: lib/index.js`, deps `@drumee/ui-styles` + `@drumee/ui-toolkit`; `src/index.js` → `loadWidgets()` + `Kind.registerAddons(require('./seeds'))` on `drumee:router:ready`/`drumee:plugins:ready`; `src/seeds.js` kind→dynamic-import; widgets `extends LetcBox` with `figName` pinning; `LOCALE.extend` with try/catch; built via `@drumee/ui-dev-tools` (`drumee-ui-devel`/`drumee-ui-deploy`), public path `/-/${ENDPOINT}/plugins/${module}/`.
- **BE (loby):** `@drumee/loby` npm package loaded into the SAME server endpoint (not a separate process) via `router/rest/index.js` `Acl.loadPlugins()` reading `/runtime/plugins/${endpoint}.json`; `service/*.js extends Entity`; `acl/*.json` map services→module; DB via `this.yp`/`this.db`; config via `Cache.getSysConf(k) || {}`; deploy `drumee-server-deploy`, register `drumee-server-plugin add`.

## Architecture

```
┌── ui-team monolith ───────────────────┐        ┌── @drumee/admin-console (FE plugin) ──┐
│ window_adminpanel SHELL (stays):      │ loads  │ src/index.js loadWidgets()+register    │
│   - extends __window_interact_singleton│──────► │ src/seeds.js: pages + widgets kinds    │
│   - window frame, topbar, content slot │ feeds  │ src/widgets/** (LetcBox, copied)       │
│   - Kind.loadPlugin('admin-console')   │ kinds  │ src/locale/** (192 keys)               │
│ launch points unchanged (kind=         │        │ vendored: skeleton/toolkit helpers     │
│   window_adminpanel)                   │        │ defaults shim                          │
└────────────────────────────────────────┘        └───────────────────────────────────────┘
        │ SERVICE.adminpanel.* (unchanged contract)
        ▼
┌── server-team endpoint ───────────────┐        ┌── @drumee/admin-api (BE plugin) ──────┐
│ Acl.loadPlugins() reads               │ loads  │ service/admin.js, adminpanel.js        │
│   /runtime/plugins/${endpoint}.json   │──────► │ acl/admin.json, adminpanel.json        │
│ (admin.js/adminpanel.js REMOVED here) │        │ service/lib/** (copied libs)           │
└────────────────────────────────────────┘        │ calls shared yp procs (NOT copied)    │
        │ this.yp.await_proc(...)                   └───────────────────────────────────────┘
        ▼
┌── schemas/yellow_page (UNCHANGED) ── organisation_*/drumate_*/domain_*/role_*/member_*/mimic_*/quota
```

## Component design

### 1. FE plugin `@drumee/admin-console` (content-plugin)

**Repo scaffold (copy signin/signup):** `package.json` (`@drumee/admin-console`, `main: lib/index.js`, deps `@drumee/ui-styles` + `@drumee/ui-toolkit`, scripts `dev`/`deploy`/`setup` via ui-dev-tools), `webpack.js` (inherited), `.dev-tools.rc/devel.sh` (`BUILD_TARGET=admin-console`, `PUBLIC_PATH=/-/${ENDPOINT}/plugins/admin-console/`).

**`src/index.js`:** identical bootstrap to signin — `loadWidgets()` then `Kind.registerAddons(require('./seeds'))` gated on `drumee:router:ready`/`drumee:plugins:ready`.

**`src/seeds.js`:** dynamic-import map for the MOVED kinds only — the 5 pages + 12 widgets. The shell kind `window_adminpanel` is NOT here (it stays in the monolith).

**`src/widgets/**`:** copy `builtins/window/adminpanel/pages/**` and `builtins/window/adminpanel/widget/**` verbatim (they `extends LetcBox`). Preserve each widget's `fig.family` (and add `figName` pinning to any whose class name could be mangled, matching onboarding's Terser guard). Copy the matching `skin/` SCSS.

**Vendored helpers:** copy the small `builtins/skeleton/toolkit` helpers the pages/widgets use (button, confirm_buttons) into `src/toolkit/` (loby/signup vendoring style), OR map to `@drumee/ui-toolkit` equivalents where they exist. `@drumee/ui-essentials` and `@drumee/ui-toolkit/templates/progress` are npm deps — keep as imports.

**`src/locale/`:** ship the ~192 admin LOCALE keys (en + all langs), loaded via `LOCALE.extend(require('../../locale')(Visitor.language()))` with the try/catch fallback.

**Monolith shell changes (the integration point):**
- `window_adminpanel` (`builtins/window/adminpanel/index.js`) stays but becomes a **loader shell**: on `onDomRefresh`/router, it ensures the plugin is loaded — `if (!Kind.get('members_page')) { await Kind.loadPlugin({ name:'admin-console', kind:'members_page' }); await Kind.waitFor('members_page'); }` (pattern from CLAUDE.md "Loading a plugin from a host module") — then feeds the plugin page kinds as today.
- `seeds.js`: REMOVE the moved page/widget entries (they now come from the plugin); KEEP `window_adminpanel`.
- The reuse in `settings/organization/admin/index.js:280` (launches `admin_security_page`) must also ensure the plugin is loaded first — route it through the same shell-load helper (or have the shell expose a `Kind.waitFor` guard).

### 2. BE plugin `@drumee/admin-api` (loby-style)

**Repo scaffold (copy loby):** `package.json` (`@drumee/admin-api`, deps `@drumee/server-core` + `@drumee/server-essentials` + `lodash` + `csv-parser`), `service/`, `acl/`, `.dev-tools.rc/devel.sh` (`DEST_DIR=/srv/drumee/runtime/plugins/server/$user/admin-api`), scripts `deploy: drumee-server-deploy`, `dev: drumee-server-devel`, `register-plugin: drumee-server-plugin add`.

**`service/admin.js`, `service/adminpanel.js`:** copy the two monolith service classes verbatim (`extends Entity` / `extends Mfs` from server-core). Keep all method bodies — they call `this.yp.await_proc(...)` against the shared procs, which is unchanged.

**`acl/admin.json`, `acl/adminpanel.json`:** copy verbatim; the `modules.private/public` paths point at `service/admin` / `service/adminpanel` within the plugin.

**`service/lib/`:** copy ONLY the libs the two services actually use — `env.js` (createHub) and whichever of `stripe.js`/`email-policy.js`/`secure-share-*` are referenced (audit at implementation time; copy minimal).

**Procedures:** NONE copied. The plugin calls the existing shared `yellow_page` procs in place.

**Registration:** add the plugin dir to `/runtime/plugins/${endpoint}.json`; `Acl.loadPlugins()` discovers `admin-api/acl/*.json` at server start. The 28+ `SERVICE.adminpanel.*` (and `SERVICE.admin.*`) routes resolve from the plugin instead of the monolith.

**Monolith changes:** REMOVE `service/private/admin.js`, `service/private/adminpanel.js`, `acl/admin.json`, `acl/adminpanel.json` from server-team after the plugin is registered and verified.

### 3. FE↔BE contract (unchanged)
The `SERVICE.adminpanel.*` / `SERVICE.admin.*` namespaces are the stable seam. Because both plugins
load into the SAME endpoints, the contract and routing are byte-for-byte preserved; either side can
migrate first while the other still lives in the monolith.

## Defaults appendix (the standing requirement)

Each item: the host previously guaranteed the value; the extracted code must add an explicit default.

**FE (admin-console):**
| Read | Today | Default to add |
|------|-------|----------------|
| `Visitor.get('org_id')` (shell init `getMyOrg`) | no fallback → crash if unhydrated | async gate: the shell waits for `Visitor.id` before launching; plugin pages guard `org_id` → empty-state, not crash |
| `Visitor.domainCan(_K.permission.admin*)` | no fallback | treat missing as `false` (hide privileged UI) — never crash |
| `Organization.get('useEmail')` | no fallback → branch taken unconditionally | default by `Platform.arch` (cloud → email reset; on-prem → link) |
| `Platform.get('arch')` | assumes cloud | explicit default `'cloud'` |
| `Kind.waitFor('members_room')` | assumes registered | plugin registers `members_room` in its own seeds → guaranteed before use |
| `LOCALE.*` (192 keys) | host LOCALE | plugin ships full `locale/` and `LOCALE.extend`s it |

**BE (admin-api):**
| Read | Default to add |
|------|----------------|
| `Cache.getSysConf('quota')`, `'default_wallpaper'`, any plugin conf | `|| {}` / sane literal (loby pattern) |
| `this.input.need(Attr.x)` vs `get` | keep `need` for required, `get` (null-safe) for optional; add derive-defaults where the monolith used to (e.g. firstname from email, `lang || 'en'`) |

## Migration / cutover (reversible, independent)

**FE:** build+deploy `admin-console` plugin → register so the host can `Kind.loadPlugin` it → convert `window_adminpanel` to the loader shell → remove moved kinds from monolith `seeds.js` → verify admin opens + all 5 pages + 12 widgets work + `settings/organization/admin` still opens `admin_security_page`. Rollback = re-add seeds entries.

**BE:** deploy `admin-api` plugin → add to `/runtime/plugins/${endpoint}.json` → restart endpoint → verify all `SERVICE.admin*.*` respond → remove `admin.js`/`adminpanel.js`/`acl/*` from server-team. Rollback = drop the plugin from the manifest (monolith copy still there until removed).

Order is free; recommended FE-first (visual verification, BE untouched) per the simpler blast radius.

## Cleanup (separate step, after extraction verified)
- Delete `src/drumee/builtins/panel/admin/` (dead) + its `seeds.js` entries (`admin_main`, `admin_members`, `admin_roles`, `admin_rules`, `admin_permissions`, `admin_security` [the panel one], `admin_log`, `admin_storage`, …).
- Delete the dead `admin` route entry (`router/modules.js` `module_admin`).

## Verification (no test runner in these repos)
Manual on live (`npm run dev`/`deploy` + `pm2 restart`): admin opens from all 3 launch points; each page CRUD works (members add/edit/delete/roles/import, domain settings, broadcast, security); `settings/organization/admin` opens the security page; BE: every `SERVICE.admin*.*` returns expected data; camera/quota/mimic flows intact; a denied/missing config (e.g. `Organization.useEmail` absent) degrades gracefully (no crash, correct default).

## Risks
1. **Window-frame seam (FE):** the shell↔plugin handoff (loader + `Kind.waitFor`) is the one novel piece — windows haven't been plugin-loaded before. Mitigate: keep the shell minimal; gate every plugin-kind use behind `Kind.waitFor`.
2. **`settings/organization/admin` cross-use** of `admin_security_page` must route through the plugin-load guard, or it opens before the plugin is registered.
3. **BE proc version drift is AVOIDED by design** (procs not copied) — the main residual BE risk is `service/lib` copies drifting from server-team; mitigate by copying minimal libs + a note to re-sync on lib changes.
4. **Terser name-mangling** of moved widget classes → pin `figName` (onboarding precedent).

## Implementation decomposition (two plans)
- **Plan A — `@drumee/admin-api` (BE):** scaffold repo, copy services+acl+min libs, register, verify, remove monolith copies, add BE defaults.
- **Plan B — `@drumee/admin-console` (FE):** scaffold repo, copy pages+widgets+locale, vendor toolkit helpers, build the monolith loader-shell, remove moved seeds, add FE defaults shim, verify.
- Cleanup (dead panel/admin + route) folds into whichever plan ships last, or a tiny third step.
