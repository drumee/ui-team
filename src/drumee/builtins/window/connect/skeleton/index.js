// ================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : /src/drumee/builtins/webrtc/endpoint/skeleton/index.coffee
//   TYPE : Skelton
// ===================================================================**/

// ===========================================================
// In-call layout for the 1:1 connect window. It now reuses the shared meeting
// shell (top bar + video stage + tiles + floating controls) directly — no
// custom connect __header (the shell's own redesigned top bar replaces it) and
// no chat panel (1:1 calls have no in-call chat). Pre-call states (dial / ring /
// pickup) are rendered separately by ./skeleton/init and keep their own layout.
// ===========================================================
const __skl_window_connect = function(_ui_, localUser, peer) {

  const body = require('builtins/webrtc/skeleton')(_ui_, localUser, peer);

  const a = Skeletons.Box.Y({
    debug       : __filename,
    // `--call` marks the in-call container so the skin can let the shell fill
    // the window (meeting-sized stage) without disturbing the pre-call grid
    // layout that shares the plain `__main` class.
    className   : `${_ui_.fig.family}__main ${_ui_.fig.family}__main--call`,
    kids        : [
      body,
      // Reactions (shared feature): the "…" more-picker wrapper (fed on demand
      // by _toggleReactionsPicker → __wrapperReactions) and the bottom-left
      // stack every sent/received reaction floats up from.
      Skeletons.Wrapper.Y({
        className: `${_ui_.fig.family}__reactions-picker`,
        name: "reactions",
      }),
      Skeletons.Box.Y({
        className: `${_ui_.fig.family}__reaction-stack`,
        sys_pn: "reaction-stack",
      }),
    ],
  });

  return a;
};
module.exports = __skl_window_connect;
