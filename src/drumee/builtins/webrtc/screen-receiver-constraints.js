// Screen-share quality knobs shared by the configs and the room.
//
// SCREEN_FPS: a max of 5 is not just "5 fps" in lib-jitsi-meet — max <= 5
// switches on capScreenshareBitrate: one layer, degradationPreference
// 'maintain-resolution', sent at videoQuality.desktopbitrate (500 kbps only
// when that is unset). Above 5 the share becomes simulcast with
// 'maintain-framerate': under CPU or bandwidth pressure the encoder drops the
// resolution and climbs back, and the viewer's screen zooms in and out every
// few seconds. Sharp, stable text beats frame rate for a shared screen.
const SCREEN_FPS = { min: 5, max: 5 };

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
