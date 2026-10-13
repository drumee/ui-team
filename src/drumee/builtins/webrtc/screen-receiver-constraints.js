// Screen-share quality knobs shared by the configs and the room.
//
// SCREEN_FPS: a max of 5 is not just "5 fps" in lib-jitsi-meet — max <= 5
// switches on capScreenshareBitrate, a single 500 kbps layer the bridge can
// only thin by dropping frames. Above 5 the share is sent as normal layers.
const SCREEN_FPS = { min: 5, max: 15 };

// Ask the bridge for the shared screen in full and everything else small.
// Without this the screen is a thumbnail-priority source like any camera.
function screenOnStage(sourceName) {
  return {
    lastN: -1,
    onStageSources: [sourceName],
    defaultConstraints: { maxHeight: 360 },
    constraints: { [sourceName]: { maxHeight: 2160 } },
  };
}

// Back to the library default once nobody is sharing.
function noScreenOnStage() {
  return {
    lastN: -1,
    onStageSources: [],
    defaultConstraints: { maxHeight: 2160 },
    constraints: {},
  };
}

module.exports = { SCREEN_FPS, screenOnStage, noScreenOnStage };
