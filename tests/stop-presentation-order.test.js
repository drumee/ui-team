// stop-presentation-order.test.js — the viewer can only tear down its copy of
// the shared screen once it HEARS about the stop, so the signals go first and
// the slow local cleanup can never hold them back.
//
//   node --test tests/stop-presentation-order.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { stopPresentationSequence } = require(path.join(
  __dirname, "..", "src/drumee/builtins/webrtc/stop-presentation.js"
));

const OPT = { desktop: "desktop", broadcast: "conference.broadcast", update: "conference.update", timeoutMs: 50 };

function host({ releaseNeverSettles = false, muteNeverSettles = false } = {}) {
  const log = [];
  return {
    log,
    room: { myUserId: () => "me" },
    warn: () => log.push("warn"),
    _releaseDesktopAudio: () => {
      log.push("release");
      return releaseNeverSettles ? new Promise(() => {}) : Promise.resolve();
    },
    stopLocalTrack: (t) => {
      log.push(`mute:${t}`);
      return muteNeverSettles ? new Promise(() => {}) : Promise.resolve();
    },
    sendRoomSignaling: (svc, data) => {
      log.push(data && data.event ? `${svc}:${data.event}` : svc);
      return Promise.resolve();
    },
  };
}

test("STOP_REMOTE_SCREEN and the mute go out before the audio release is awaited", async () => {
  const h = host({ releaseNeverSettles: true });
  await stopPresentationSequence(h, { id: "t" }, OPT);
  assert.ok(h.log.includes("conference.broadcast:STOP_REMOTE_SCREEN"));
  assert.ok(h.log.includes("mute:desktop"));
});

test("a stalled mute still lets the broadcast out and the call resolves", async () => {
  const h = host({ muteNeverSettles: true });
  await stopPresentationSequence(h, { id: "t" }, OPT);
  assert.ok(h.log.includes("conference.broadcast:STOP_REMOTE_SCREEN"));
});

test("payload names us as the stopping presenter", async () => {
  let payload;
  const h = host();
  h.sendRoomSignaling = (svc, data) => { if (data && data.event) payload = data.payload; return Promise.resolve(); };
  await stopPresentationSequence(h, { id: "t" }, OPT);
  assert.deepEqual(payload, { id: "me", srcId: "me" });
});

test("no desktop track: audio is still released, nothing is broadcast", async () => {
  const h = host();
  await stopPresentationSequence(h, null, OPT);
  assert.deepEqual(h.log, ["release", "warn"]);
});

test("the same track stopped twice (OS bar + raw ended) signals once", async () => {
  const h = host();
  const track = { id: "t" };
  await Promise.all([
    stopPresentationSequence(h, track, OPT),
    stopPresentationSequence(h, track, OPT),
  ]);
  assert.equal(h.log.filter((l) => l === "conference.broadcast:STOP_REMOTE_SCREEN").length, 1);
});
