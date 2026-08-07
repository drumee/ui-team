// Window header for the 1:1 "Drumee connect" call (Figma: title on the left,
// CornersOut + X on the right). Shared by every P2P call screen — pre-call
// (dial / ring), in-call and the terminal "call ended" panel — so the chrome
// never shifts as the call moves between states.
//
// P2P ONLY. Team meetings (window/meeting) keep the full control cluster in
// webrtc/skeleton/topbar.js; this file is reached exclusively through the
// `service_class === "connect"` branch there.
module.exports = function (_ui_) {
  const pfx = _ui_.fig.family;

  return Skeletons.Box.X({
    debug: __filename,
    // window__header marks the bar as the window drag handle.
    className: `${pfx}__call-header window__header`,
    kids: [
      Skeletons.Note({
        className: `${pfx}__call-header-title`,
        content: LOCALE.DRUMEE_CONNECT,
        sys_pn: "call-title",
      }),
      Skeletons.Box.X({
        className: `${pfx}__call-header-actions`,
        kids: [
          // CornersOut — native fullscreen on the window root, handled by
          // window/connect/index.js → _toggleWindowFullscreen.
          Skeletons.Button.Svg({
            className: `${pfx}__call-header-btn expand`,
            ico: "meet-expand",
            service: "toggle-fullscreen",
            uiHandler: [_ui_],
            bubble: 0,
          }),
          Skeletons.Button.Svg({
            className: `${pfx}__call-header-btn close`,
            ico: "meet-x",
            service: _e.close,
            uiHandler: [_ui_],
            bubble: 0,
          }),
        ],
      }),
    ],
  });
};
