// Pin over a share (Google-Meet style): while a screen is shared, pinning a
// participant puts THEIR tile on the stage and moves the shared screen into
// the strip's first slot. Un-pinning swaps them back. (With no share the pin
// is window_meeting._layoutPinStage's grid, which moves nothing.)
//
// Only elements move — appendChild / insertBefore on an attached node is a
// move, so every <video> keeps its srcObject and never stops playing (the same
// trick screenshare._dockParticipants and call parking rely on). A comment
// marker holds the tile's place in the participants manager, so it goes home
// in join order.
//
// The parts, as window_meeting._pinOverShareParts resolves them:
//   stage     __endpoints — where the shared screen normally sits
//   strip     __float-tiles — the strip beside / under the shared screen
//   home      the participants manager element (inside the strip)
//   presenter the __presenter element holding the shared screen
//   tile      the pinned participant's tile element
//
// No `this` and nothing but node methods: runs under plain node in a test.

const MARKER = "pin-stage";

function pinStageWanted(s) {
  return !!(
    s && s.docked && !s.parked &&
    s.stage && s.strip && s.home && s.presenter && s.tile
  );
}

function findMarker(home) {
  if (!home || !home.childNodes) return null;
  for (const n of Array.from(home.childNodes)) {
    if (n.nodeType === 8 && n.data === MARKER) return n;
  }
  return null;
}

function dropMarker(home) {
  const m = findMarker(home);
  if (m && m.parentNode) m.parentNode.removeChild(m);
}

function enterPinStage({ stage, strip, home, presenter, tile, doc }) {
  if (tile.parentNode !== stage) {
    // Mark the slot only when leaving the manager. A tile pulled back home by
    // a collection re-render gets a fresh marker where it now sits.
    if (tile.parentNode === home) {
      dropMarker(home);
      home.insertBefore(doc.createComment(MARKER), tile);
    }
    stage.appendChild(tile);
  }
  if (strip.firstChild !== presenter) {
    strip.insertBefore(presenter, strip.firstChild);
  }
}

function leavePinStage({ stage, home, presenter, tile }) {
  // The stage is a grid: the screen goes first, ahead of the manager that
  // _dockParticipants(false) may already have put back.
  if (presenter && stage && stage.firstChild !== presenter) {
    stage.insertBefore(presenter, stage.firstChild);
  }
  const marker = findMarker(home);
  // A detached tile was destroyed (its participant left): nothing to restore.
  if (tile && tile.parentNode && tile.parentNode !== home && home) {
    if (marker) home.insertBefore(tile, marker);
    else home.appendChild(tile);
  }
  if (marker && marker.parentNode) marker.parentNode.removeChild(marker);
}

module.exports = { pinStageWanted, enterPinStage, leavePinStage, MARKER };
