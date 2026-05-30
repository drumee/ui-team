# Chat Typing Indicator — Design

Date: 2026-05-26
Status: Approved (implementing)

## Goal

Show a live "X is typing…" indicator in the Drumee chat widget
(`src/drumee/builtins/widget/chat/`) for both 1-on-1 (personal/P2P) and group
(channel/hub) conversations.

## Decisions

- **Scope:** Full-stack (UI + server-team). No schema changes — the signal is
  ephemeral and never persisted.
- **Modes:** Both P2P and channel. Channels aggregate multiple typers.
- **Placement:** A typing bubble at the bottom of the message viewport
  (`__chat-content-inner`), styled as an incoming message with animated dots.
- **Transport:** HTTP ephemeral service (Approach A) — new `chat.typing` /
  `channel.typing` services that broadcast via `RedisStore.sendData` and write
  nothing. Mirrors the existing `channel.acknowledge` service. Chosen over a
  WebSocket-upstream route (new untested pattern in `routeUpstream`) and over
  overloading the `ping` presence channel.

## Server (server-team)

`getServices()` (router/rest) derives `SERVICE.<module>.<key>` from the ACL
JSON keys, and the REST router dispatches `module.key` to the class method
(validating scope/permission/params). So each service needs one ACL entry plus
one method.

- `acl/channel.json` → add `typing` (scope `hub`, permission `read`, params:
  `state?` (1/0, default 1), `socket_id` required).
- `service/private/channel.js` → `async typing()`: broadcast
  `{author_id, uid, firstname, lastname, hub_id, state}` to
  `entity_sockets({exclude:[socket_id], hub_id})` via
  `payload(data, {service:"channel.typing"})`. Bind in constructor.
- `acl/chat.json` → add `typing` (scope `hub`, permission `read`, params:
  `entity_id` required, `state?`).
- `service/private/chat.js` → `async typing()`: broadcast
  `{author_id, firstname, lastname, peer_id:this.uid, state}` to
  `user_sockets(entity_id)`. `peer_id` is the sender so the recipient's widget
  matches it against their `peerId`. Bind in constructor.

## Client (ui-team) — `widget/chat`

### Sender
- Hook the existing `onInputChange(args)` (fires per keystroke; already used to
  persist drafts). When text is non-empty, send a typing signal **throttled** to
  once per 3s; (re)arm a 4s idle timer that sends `state:0` (stopped).
- Send stop on `sendMessage` and in `onBeforeDestroy`. Skip when peer is blocked.
- Mode-aware: personal/privateRoom → `SERVICE.chat.typing` with
  `{hub_id, entity_id:peerId}`; channel areas → `SERVICE.channel.typing` with
  `{hub_id}`.

### Receiver
- `this._typers = Map<author_id, {name, timer}>`. On a `*.typing` event in
  `onWsMessage` (match hub_id for channel, peer_id for P2P; ignore self):
  `state:1` adds/refreshes the entry and resets a ~6s expiry timer; `state:0`,
  expiry, or a real incoming message from that author removes it. Re-render on
  every change.

### Render
- Skeleton: a `Box.X` part `sys_pn:'typing-indicator'`, `state:0`, inside
  `__chat-content-inner`, holding animated dots + a `sys_pn:'typing-text'` Note.
- `_renderTypers()` toggles `state` and sets text via LOCALE:
  1 → `IS_TYPING` (`"{0} is typing…"`), 2 → `TWO_TYPING`
  (`"{0} and {1} are typing…"`), ≥3 → `SEVERAL_TYPING`
  (`"Several people are typing…"`).
- New BEM block `widget-chat__typing-indicator` in `skin/index.scss`, pinned to
  the bottom-left of the viewport, with a 3-dot CSS keyframe animation.

## Component boundaries

Three independent units: sender throttle, receiver `_typers` state, and the
render/skeleton — each testable on its own. No test runner exists in ui-team;
verification is `npm run build`.

## Notes / follow-ups

- New `SERVICE.*.typing` names resolve client-side only after the server picks
  up the ACL change and the client reloads `get_env`.
- Placement is pinned to the bottom of the message viewport (robust against the
  virtualized Smart list) rather than injected as a list collection item; it
  still reads as the newest bubble at the conversation bottom.
