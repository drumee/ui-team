---
paths:
  - "src/drumee/builtins/window/**/*.js"
  - "src/drumee/builtins/player/**/*.js"
  - "src/drumee/builtins/webrtc/**/*.js"
---

# Window, Player & WebRTC Room Development

## Inheritance chain — don't skip levels

```
LetcBox → __window_utils → __window_core → __window_interact → <your window>
```

- Chat windows → extend `chatInteract`.
- Video/call windows → extend `__room`.
- Players → extend `__window_interact_player`.

This chain is for **top-level** windows/players/rooms only. Leaf/child widgets nested under `player/**` and `webrtc/**` extend `LetcBox` (e.g. `__player_page` in `player/document/page`, `__endpoint` in `webrtc/endpoint`) — match the sibling, don't force them onto the window chain.

## Opening / closing

- Open via `Wm.launch({ kind, media, ... })` — ❌ never `new __window_x()`.
- Close via `this.goodbye()` or an `onUiEvent` `_e.close` case.
- Single-instance windows (account, adminpanel) extend the `__intercat_singleton` variant — don't bypass it or you get duplicate windows.

## Event dispatch

- All skeleton actions land in `onUiEvent(cmd, args)` — add a `case` keyed by `service` (CLAUDE.md → "service + uiHandler → onUiEvent").
- Part wiring in `onPartReady(child, pn)`.

## Cleanup (critical)

In `onBeforeDestroy`: `unbindEvent`, kill TweenMax tweens / timers, and **release media streams** for players and webrtc rooms. A leaked room keeps camera/mic active.

## DON'T

- ❌ manage z-order / position manually — `Wm` owns layering.
- ❌ hardcode window size — use the interact-base sizing logic.
