/**
 * Pre-call screen for the 1:1 "Drumee connect" call, used for both 'dial'
 * (outbound) and 'ring' (inbound).
 *
 * Figma layout, top to bottom:
 *   window header (title + expand + close)
 *   centred identity — round 120px avatar, display name, email
 *   footer — call status ("Calling…" / "Incoming call…") above the round
 *            call-action buttons
 *
 * The status text is the shared `message-container` part, so every
 * stateMessage() call the room already makes lands in the right place; the
 * skin keeps it in the footer flow here instead of the in-call overlay.
 */
const __webrtc_init = function (_ui_, peer) {
  const fig = _ui_.fig.family;
  const grp = _ui_.fig.group;
  peer = peer || {};

  // The header goes straight into __main, with no wrapper. A wrapper carrying
  // `${grp}__header` would put a SECOND `window__header` (the drag-handle
  // marker) around the one p2p-header already sets, and gave the pre-call
  // screen a header box the live screen doesn't have.
  const header = require("builtins/webrtc/skeleton/p2p-header")(_ui_);

  const stage = Skeletons.Box.Y({
    className: `${fig}__precall-stage`,
    kids: [require("./identity")(_ui_, peer)],
  });

  const footer = Skeletons.Box.Y({
    className: `${fig}__precall-footer`,
    kids: [
      Skeletons.Wrapper.Y({
        sys_pn: "message-container",
        className: `${grp}__message-container ${fig}__message-container`,
        partHandler: [_ui_],
      }),
      require("./default-commands")(_ui_),
    ],
  });

  const body = Skeletons.Box.Y({
    className: `${fig}__body ${grp}__body`,
    sys_pn: _a.content,
    attrOpt: { "data-header": _ui_.mget(_a.header), "data-phase": "precall" },
    dataset: { header: _ui_.mget(_a.header), phase: "precall" },
    kids: [stage, footer],
  });

  return Skeletons.Box.Y({
    debug: __filename,
    className: `${fig}__main`,
    kids: [header, body],
  });
};

module.exports = __webrtc_init;
