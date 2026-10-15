// call-parking _resumeCallVideos — after the call window is moved into (or out
// of) the desk dock, only the call's own live media may be re-started. The
// meeting window also mounts the team chat, whose video attachments are inline
// `<video src=… preload="none">` elements sitting paused; parking the call used
// to play every one of them, out of sight, with sound.
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const parking = require(path.join(
  __dirname, "..", "src/drumee/builtins/webrtc/call-parking.js"
));

// A media element double: records play() calls.
function media({ paused = true, srcObject = null, src = "" } = {}) {
  const m = { paused, srcObject, src, played: 0 };
  m.play = () => {
    m.played++;
    m.paused = false;
    return Promise.resolve();
  };
  return m;
}

function host(elements) {
  const self = Object.assign({}, parking);
  self.el = { querySelectorAll: (sel) => (assert.equal(sel, "video, audio"), elements) };
  return self;
}

test("a paused live call element (srcObject) is resumed", () => {
  const remoteAudio = media({ srcObject: {} });
  const selfView = media({ srcObject: {} });
  host([remoteAudio, selfView])._resumeCallVideos();
  assert.equal(remoteAudio.played, 1);
  assert.equal(selfView.played, 1);
});

test("a paused chat attachment video (src only) is NOT played", () => {
  const chatVideo = media({ src: "https://drumee.in/-/svc/media.orig/x.mp4" });
  host([chatVideo])._resumeCallVideos();
  assert.equal(chatVideo.played, 0);
  assert.equal(chatVideo.paused, true);
});

test("an element already playing is left alone", () => {
  const playing = media({ paused: false, srcObject: {} });
  host([playing])._resumeCallVideos();
  assert.equal(playing.played, 0);
});

test("an empty element (no source yet) is left alone", () => {
  const empty = media();
  host([empty])._resumeCallVideos();
  assert.equal(empty.played, 0);
});

test("a rejected play() does not throw", () => {
  const blocked = media({ srcObject: {} });
  blocked.play = () => Promise.reject(new Error("NotAllowedError"));
  assert.doesNotThrow(() => host([blocked])._resumeCallVideos());
});

test("no element: no-op", () => {
  const self = Object.assign({}, parking);
  self.el = null;
  assert.doesNotThrow(() => self._resumeCallVideos());
});
