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
- Call **windows** → extend `__room` (= `require('builtins/webrtc/room/jitsi')`, the Jitsi wrapper), e.g. `window/connect`. The base WebRTC room itself (`webrtc/room`) extends `window/interact/webrtc`, **not** `__room` — don't put it on the `__room` chain.
- Players → extend `__window_interact_player`.

This chain is for **top-level** windows/players/rooms only. For leaf/child widgets nested under `window/**/widget/**`, `player/**`, and `webrtc/**`, **match the existing sibling/base class** — don't put them on the top-level window chain. Many extend `LetcBox` (`__account_entry`, `__player_page` in `player/document/page`, `__endpoint` in `webrtc/endpoint`), but some intentionally extend an intermediate base (e.g. `webrtc/endpoint/remote/display` extends `__stream` for WS binding; `player/widget/invitation` extends `mfsInteract`). Don't rewrite their base. (Those `widget/**` files also load `widget-development.md`.)

## Opening / closing

- Open via `Wm.launch({ kind, media, ... })` — ❌ never `new __window_x()`.
- Close via `this.goodbye()` or an `onUiEvent` `_e.close` case.
- Single-instance windows (account, adminpanel) extend `__window_interact_singleton` (`require('window/interact/singleton')`) — don't bypass it or you get duplicate windows. (Note: `window/account` aliases it locally as the misspelled `__intercat_singleton`; use the real name `__window_interact_singleton` elsewhere.)

## Event dispatch

- All skeleton actions land in `onUiEvent(cmd, args)` — add a `case` keyed by `service` (CLAUDE.md → "service + uiHandler → onUiEvent").
- Part wiring in `onPartReady(child, pn)`.

## Cleanup (critical)

In `onBeforeDestroy`: `unbindEvent`, kill TweenMax tweens / timers, and **release media streams** for players and webrtc rooms. A leaked room keeps camera/mic active.

## DON'T

- ❌ manage z-order / position manually — `Wm` owns layering.
- ❌ hardcode window size — use the interact-base sizing logic.
