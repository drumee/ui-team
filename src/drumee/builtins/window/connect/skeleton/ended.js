/**
 * Terminal screen for the 1:1 call (Figma "get rejected" / call ended): the
 * same header and identity block as the pre-call screen, with a single status
 * line — "Call ended (04:56)", "Call declined", … — and no action buttons.
 *
 * Fed by window/connect/index.js just before the window closes itself, so the
 * outcome of the call is readable instead of the window vanishing.
 */
const __window_connect_ended = function (_ui_, peer, message) {
  const fig = _ui_.fig.family;
  const grp = _ui_.fig.group;

  // Header goes straight into __main — see the note in ./init.
  const header = require("builtins/webrtc/skeleton/p2p-header")(_ui_);

  const body = Skeletons.Box.Y({
    className: `${fig}__body ${grp}__body`,
    sys_pn: _a.content,
    attrOpt: { "data-phase": "ended" },
    dataset: { phase: "ended" },
    kids: [
      Skeletons.Box.Y({
        className: `${fig}__precall-stage`,
        kids: [require("./identity")(_ui_, peer)],
      }),
      Skeletons.Box.Y({
        className: `${fig}__precall-footer`,
        kids: [
          Skeletons.Note({
            className: `${fig}__ended-message`,
            content: message || LOCALE.CALL_ENDED,
          }),
        ],
      }),
    ],
  });

  return Skeletons.Box.Y({
    debug: __filename,
    className: `${fig}__main`,
    kids: [header, body],
  });
};

module.exports = __window_connect_ended;
