# WebRTC Mute/Unmute + Video Toggle — Logic Review & Fix (Design)

**Date:** 2026-06-24
**Branch:** `fix/call-video-voice-controls` (existing, uncommitted call fixes live here)
**Status:** Approved scope — ready for implementation plan

## Goal

Audio + video media now flow in P2P/JVB calls (the prosody cert-permission root cause is
fixed). This task reviews the **mute/unmute** and **enable/disable video** control logic for
both the caller (local controls) and the receiver (remote tile), and fixes the two genuine
correctness bugs found, plus removes leftover debug instrumentation.

## Scope (approved)

In scope: **B1 + B2 + C1** only.

Explicitly **out of scope** (user chose to keep current behavior):
- Video OFF stays `mute()` (current). Video ON stays `createLocalTracks()` (the on/off
  asymmetry — ON could be `unmute()` for symmetry/speed — is noted as a deferred optional, not
  done now).
- The 3000 ms settle delay before a remote camera attaches stays as-is.

## Background — how the controls are wired

- Control buttons are built in `webrtc/skeleton/commands.js`. `sys_pn: "ctrl-audio"` /
  `"ctrl-video"` / `"ctrl-screen"` auto-bind to `this.__ctrlAudio` / `__ctrlVideo` /
  `__ctrlScreen` on the room via `registerPart` (`"__" + camelCase(name)`).
- Click → `room/index.js onUiEvent` (`service: settings`, `name: audio|video`) →
  `changeLocalAudio(state)` / `changeLocalVideo(state)` in `room/jitsi.js`.
- Caller mic: OFF = `track.mute()`, ON = `unmute()` (or recreate if not active).
- Caller camera: OFF = `stopLocalTrack(CAMERA)` which is `track.mute()`; ON =
  `createLocalTracks(video)` (creates a new track, `replaceTrack`s the muted old one).
- Receiver tile (`endpoint/remote/user/index.js`) listens to conference
  `TRACK_MUTE_CHANGED` + local `"TRACK_ADDED"` → `handleTrackEvents` → routes audio to
  `handleAudioMuteChange`, video to avatar or `handleVideoMuteChange` (attaches after the
  3 s settle).

## The two bugs

### B1 — Remote mute indicator reflects the LOCAL user's mic, not the remote's

`endpoint/remote/user/index.js` `isMuted()`:

```js
isMuted() {
  let p = this.participant;
  if (!p) return true;
  if (this.logicalParent.__ctrlAudio.getState() == 0) {   // <-- LOCAL mic button
    return true;
  }
  return p.isAudioMuted();
}
```

`this.logicalParent.__ctrlAudio` is the **local** user's microphone toggle. So whenever the
local user mutes their own mic, every remote participant's tile is reported muted
(`triggerService` sets `muted` on the model, `updateCommandPanel` flips the remote 'audio'
indicator). The remote's mute state must depend only on the remote participant.

**Fix:** drop the local `__ctrlAudio` gate; return `p.isAudioMuted()` (guarding the no-participant
case). Result:

```js
isMuted() {
  const p = this.participant;
  if (!p) return true;
  return p.isAudioMuted();
}
```

### B2 — Local `onTrackMuteChange` self-removes after the first fire → mic button desyncs

`room/jitsi.js onTrackMuteChange` ends with:

```js
track.removeEventListener(JEVENTS.track.TRACK_MUTE_CHANGED, this.onTrackMuteChange);
```

The listener is added once per track in `_doCreateLocalTracks`. Audio mute/unmute reuses the
**same** track, so after the first toggle the listener is gone and `this.isAudio` /
`__ctrlAudio.setState` are no longer driven from the authoritative track state — the button
stays correct only because the framework toggles its own `data-state` on click, which silently
drifts if a mute/unmute ever fails or is driven from elsewhere.

**Fix:** make the listener persist for the track's lifetime — remove the self-`removeEventListener`
from `onTrackMuteChange`, and instead detach it where the track is actually torn down
(`stopLocalTrack` for audio is mute-only so the track survives; the real teardown points are the
dispose/replace paths in `_doCreateLocalTracks` — when an old track is pushed to `idleStreams` /
disposed/replaced — and call teardown / `leaveRoom`). Net effect: the mic/camera button stays in
sync across repeated mute/unmute, with no listener accumulating on dead tracks.

Idempotency note: with the listener persistent, `onTrackMuteChange` will run on every video
mute-change and call `toggleAvatarVideo`, the same call `changeLocalVideo` already makes. These
are idempotent (visibility/display toggles), so double-invocation is harmless.

## Cleanup

### C1 — Remove `[VIDDBG]` instrumentation

Four `console.log("[VIDDBG] …")` sites added during the media-flow investigation:
- `endpoint/remote/user/index.js` — `handleTrackEvents` (video case), `handleVideoMuteChange`
  (`hVMC enter`, `hVMC ATTACHED`).
- `room/jitsi.js` — `onStreamReceived`, the `SEND video` case in `_doCreateLocalTracks`.

Remove all four; keep the surrounding logic.

## Files touched

- `src/drumee/builtins/webrtc/endpoint/remote/user/index.js` — B1 (`isMuted`), C1 (remove 2 logs).
- `src/drumee/builtins/webrtc/room/jitsi.js` — B2 (`onTrackMuteChange` + teardown detach),
  C1 (remove 2 logs).

No skeleton, SCSS, locale, or seeds changes. No new files.

## Verification (no test runner in this repo)

This repo has no automated test harness; WebRTC behavior is verified on a live 2-party call
(accounts A = vudangnt@gmail.com, B = cuocsongthanhbinh49@gmail.com on drumee.in). After
`npm run dev` deploy + `pm2 restart vudangnt` and a hard refresh on both machines:

1. **B1:** A mutes own mic → B's tile of A shows muted; **A's tile of B stays unmuted** (was
   wrongly flipping before). Symmetric from B's side.
2. **B2:** A toggles mic mute/unmute **3+ times** → the mic button state matches the actual
   capture state every time (no stuck/inverted button after the first toggle). Same for the
   camera button.
3. **No regression:** enable/disable video both directions still shows camera ↔ avatar
   correctly; audio still audible after unmute; screenshare unaffected.
4. **C1:** browser console shows no `[VIDDBG]` lines during a call.

## Risks

- B2 changes listener lifetime. Risk: a listener left attached to a disposed track could fire on
  a dead object. Mitigated by detaching in the dispose/replace paths. Low risk — audio reuses one
  track; video creates fresh tracks (each with its own listener) and the old one is disposed.
- B1 is a pure narrowing of a boolean condition; lowest risk.
