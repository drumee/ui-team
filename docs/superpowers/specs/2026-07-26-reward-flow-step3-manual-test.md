# Reward flow step 3 — manual test matrix

None of this can run on the dev box: it needs a campaign signup
(`?utm_campaign=free-storage`), a real `desk.create_hub`, and a real upload.
Run it against an instance with a real user. Force the flow with `?reward=1`.

Reset between cases, in the browser console:

```js
["reward_flow_done", "reward_step", "reward_invited", "reward_workspace"]
  .forEach((k) => localStorage.removeItem(k));
```

| # | Case | Expected |
|---|---|---|
| 1 | Step 1 → internal workspace, invite a member in the permission panel | Step 2 card centred, button reads **Continue** |
| 2 | Step 1 → internal workspace, close the panel without inviting | Step 2 card under the topbar Invite button, button reads **Invite member** |
| 3 | Step 1 → external (share) workspace | Step 2 shows **Invite member** |
| 4 | Step 1 → personal workspace | Step 2 shows **Invite member** |
| 5 | Reach step 3 after any of the above | Card centred, no cutout on the topbar `New` control, button reads **Open workspace** |
| 6 | Click **Open workspace** | The step-1 workspace opens; cutout wraps the whole workspace window; coach shows the "This is your workspace" text with **Back** and **Next** |
| 7 | Click **Next** | Cutout narrows to the folder **New** pill; coach says to click it |
| 8 | Click folder **New** | Cutout narrows to **From device**; the other dropdown rows are greyed and unclickable |
| 9 | Click **From device**, pick a file | OS picker opens; on upload the workspace window closes by itself and the congrats modal appears over the desk at Home |
| 9a | Same, but with a SECOND workspace already open in another tab | Only the step-1 workspace closes; the other tab survives and the sidebar keeps its highlight |
| 9b | Legacy step 3 (no stored workspace) → upload from the topbar | Congrats appears; nothing is closed, because the flow never opened anything |
| 10 | **Back** at sub-steps 6/7/8 | Returns to the step 3 card; the workspace stays open |
| 11 | Click the dimmed area at any sub-step | "Don't drop now" modal; Continue resumes the sub-step |
| 12 | Reload while on step 3 | Resumes on the step 3 card (NOT step 1), still the **Open workspace** variant |
| 13 | Reload mid-walkthrough (during 6/7/8) | Resumes on the step 3 card — the workspace window is gone, so the card is the only truthful place to land |
| 14 | Reload on step 3 after `localStorage.removeItem("reward_workspace")` | Legacy variant: cutout on the desk topbar `New` control, button reads **Upload** and still dispatches `_e.upload` directly |
| 15 | Delete the step-1 workspace, then click **Open workspace** | After ~4 s the card drops to the legacy **Upload** variant rather than hanging |
| 16 | Open a workspace where the user is view-only, then reach step 3 | The folder **New** pill never appears (permission-gated `data-visible`); after ~4 s the flow drops to the legacy variant |
| 17 | Step 1 walkthrough end to end (`New` → auto-expanded create flyout → `Workspace` → form → perm), plus Back at each | The guide advances through the merged desk topbar without getting stuck on the hidden nested Workspace row |
| 18 | Step 1 → Back to the step 1 card → Continue → create a *different* workspace type | Step 2 and step 3 both reflect the NEW run: no stale Continue, and step 3 opens the newly created workspace |

## What was verified automatically

- 51 unit tests (`node --test "test/**/*.test.js"`) covering step-name
  resolution, workspace-descriptor parsing, card variant selection and the
  step 3 sub-step decision table. **The tests are not committed** —
  `.gitignore` excludes `test/`.
- `node --check` on every changed `.js`
- `JSON.parse` on all six locale files, and a per-locale assertion that every
  reward-flow key is present
- a standalone `sass` compile of the reward-flow skin
- every `reward-flow/` module requires cleanly under bare Node

None of that exercises the real DOM, the real desk, or a real upload. Cases
1–18 above are the only thing that does.
