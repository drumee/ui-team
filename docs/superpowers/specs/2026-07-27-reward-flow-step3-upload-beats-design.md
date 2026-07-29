# Reward flow — Step 3 upload + files beats

**Date:** 2026-07-27
**Status:** approved
**Area:** `src/drumee/builtins/widget/reward-flow`
Extends `2026-07-26-reward-flow-step3-workspace-guide-design.md`

## Problem

The Step 3 walkthrough ends at the file picker. `RADIO_MEDIA _e.uploaded` — which
fires once per job, on the first file-done — went straight to the congrats
modal, and congrats closes the workspace on its way in.

So the user is walked into the workspace they created, told to put a file in it,
and then the workspace is torn off the screen in the same frame the file lands.
They never see the file arrive. The step teaches where files live and then hides
the evidence.

## Flow

```
step3_guide
  ├─ folder     cutout = .window-folder__ui (no hole: dim all)   coach + [Next]
  ├─ new        cutout = .window-folder-topbar__new-ctrl         DOM-driven
  ├─ device     cutout = …dropdown-menu__item--from-device       DOM-driven
  │             sibling rows greyed
  │  OS file picker → files handed over
  ├─ uploading  cutout = .window-upload-progress__ui             coach
  │  RADIO_MEDIA _e.uploaded
  └─ files      cutout = .window-folder__files-panel             coach + [Next]
       │
       ▼  _completeStep3(): track done → close workspace → congrats
```

## Design

### Two new beats, no new machinery

`GuideCore` already paints `__cutout` + `__coach` per sub-step from a
MutationObserver, so both beats are additions to `RewardUploadGuide`'s selector
table, `ORDER` (uploading 4, files 5) and `resolveSub`. Nothing new is wired into
the orchestrator's render path.

| beat | target | coach |
|---|---|---|
| `uploading` | `.window-upload-progress__ui` | "Uploading your files…", no Back, no Next |
| `files` | `.window-folder__files-panel` | "Here are your files…", no Back, **Next** |

`.window-folder__files-panel` is built by both the grid and the row view
(`window/skeleton/toolkit` `filesContainer` / `folderFilesRowContainer`), so the
highlight follows whichever the user is in.

Neither beat offers Back. It exits to the Step 3 card, which asks the user to
upload something they have just uploaded — the same reason Step 1's perm phase
drops Back once the workspace exists.

### Resolution order

Both new branches sit ahead of the existing ones, because once files are in
flight nothing earlier applies:

```js
if (s.uploaded) return s.filesPanel ? "files" : null;
if (s.uploading) return "uploading";
```

The `null` is deliberate. If the panel is not on screen — the user flipped to
another tab of the window — the guide HOLDS instead of falling through, because
rewinding a finished walkthrough to "click New" would be nonsense. It resolves
the moment they come back.

`uploaded` is a latch set by `onUploaded()`, not a DOM read: nothing on screen
says "an upload succeeded", since the progress window looks much the same
mid-flight as it does when it is done.

### Signal wiring

- `onUploadDone()` (RADIO_MEDIA `_e.uploaded`) hands off to the guide when one is
  running: `_uploadGuide.onUploaded()`, staying in `step3_guide`.
- The legacy path (`step3_waiting` — topbar upload, no workspace window and no
  files panel to point at) still completes on the signal, unchanged.
- The coach's Next reaches `onNext()` through the existing `reward-guide-next`
  service. It now branches: `folder` releases as before, `files` calls
  `ui.onUploadGuideComplete()`.
- The old tail of `onUploadDone` is extracted to `_completeStep3()` — track
  `done`, close the workspace, re-render, open congrats — and is what both
  completion paths call.

Two new LOCALE keys with English fallbacks: `REWARD_FLOW_GUIDE_UPLOADING`,
`REWARD_FLOW_GUIDE_FILES`.

## Testing

`resolveSub` is pure and requirable under bare Node; its decision table is
covered by a 13-case check (existing beats unchanged, both new beats, and the
three HOLD cases). Everything else is manual, via `?reward=1`:

1. Reach Step 3, **Open workspace**, walk to **From device** and pick a file.
2. The progress window is spotlighted with the "uploading" coach.
3. The file lands → the spotlight moves to the files panel with the file in it.
4. **Next** → workspace closes, congrats appears, funnel records `done`.
5. Legacy path (Back out to the Step 3 card, upload from the card) still goes
   straight to congrats.
6. Clicking the dim during either new beat still raises "Don't drop now".
