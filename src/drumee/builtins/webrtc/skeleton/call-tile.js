// Parked-call tile furniture, shared by the team meeting and the 1:1 connect
// window. Both park into the SAME desk dock through builtins/webrtc/call-parking,
// and the skin for both already lives in the shared shell mixin
// (webrtc/skin/meeting-shell `&__ui[data-call-tile="1"]`, written against the
// `$pfx` each window passes), so the only thing left to share was the markup.
//
// Everything here is inert at full size — the skin only reveals it under
// `[data-call-tile="1"]`, which call-parking stamps on the window root.
module.exports = function (_ui_) {
  const pfx = _ui_.fig.family;

  return [
    // Always-visible "LIVE" mark for the parked tile (the cover below only
    // shows on hover). Hidden by the skin at full size.
    Skeletons.Box.X({
      className: `${pfx}__call-tile-live`,
      kidsOpt: { active: 0 },
      active: 0,
      kids: [
        Skeletons.Box.X({
          className: `${pfx}__call-tile-live-dot`,
          active: 0,
        }),
        Skeletons.Note({
          className: `${pfx}__call-tile-live-label`,
          content: LOCALE.LIVE,
          active: 0,
        }),
      ],
    }),

    // Return-to-call cover. Hidden until the window is parked as a corner tile
    // (data-call-tile="1", set by call-parking.setCallTile when the desk
    // navigates away). It then covers the whole tile, so the single click that
    // reaches this window brings the call back to size instead of hitting a
    // 300px-wide copy of the in-call controls.
    Skeletons.Box.Z({
      className: `${pfx}__call-tile-cover`,
      sys_pn: "call-tile-cover",
      service: "restore-call",
      uiHandler: [_ui_],
      kidsOpt: { active: 0 },
      kids: [
        Skeletons.Image.Svg({
          ico: "rail-meet",
          className: `${pfx}__call-tile-ico`,
        }),
        Skeletons.Note({
          className: `${pfx}__call-tile-label`,
          content: LOCALE.RETURN_TO_CALL,
        }),
      ],
    }),
  ];
};
