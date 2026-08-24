// Campaign attribution: the markers must be PERSISTED before the URL is
// consumed.
//
// captureCampaignArrival() runs from the router's initialize(), before any
// module resolves — that is deliberate, because the signin plugin replaces the
// hash wholesale and the markers would be gone by the time a module looked.
// But it also strips them from the URL, and welcome/index.js and
// desk/index.js call captureUtm() LATER. Measured on a cold arrival at
//
//   /-/huan?utm_campaign=test&utm_source=linkedin&utm_medium=social&utm_content=test
//
// captureUtm() read an already-stripped URL, returned {}, and stored nothing:
// every signup arriving through the welcome/signin landing was attributed to
// nothing at all. Nothing failed and nothing logged — the signup simply
// counted as organic.
//
// So the order inside captureCampaignArrival is load-bearing, and this pins
// it. Reordering those two lines, or dropping the captureUtm() call, puts the
// attribution back in the bin.
const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const SRC = readFileSync(
  join(__dirname, "../src/drumee/libs/campaign.js"), "utf8");

const arrival = SRC.match(/function captureCampaignArrival\(\)[\s\S]*?\n\}/);

/**
 * Source with comments removed.
 *
 * The comments in this very function NAME both calls, so an index search over
 * the raw body matches the prose before the code and reports the right order
 * whatever the code does. This test passed against a deliberately reordered
 * copy until it stripped them.
 */
const stripComments = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/(^|[^:])\/\/.*$/gm, "$1");

test("captureCampaignArrival persists before it strips", () => {
  assert.ok(arrival, "could not find captureCampaignArrival");
  const body = stripComments(arrival[0]);
  const persist = body.indexOf("captureUtm()");
  const strip = body.indexOf("stripCampaignParams()");
  assert.ok(persist > -1, "the markers are never persisted on this path");
  assert.ok(strip > -1, "the arrival is never consumed");
  assert.ok(
    persist < strip,
    "stripping before persisting leaves captureUtm reading an empty URL — " +
    "the signup is then attributed to nothing"
  );
});

test("every marker the capture reads is a marker the strip removes", () => {
  // A key read but not stripped is left orphaned in the address bar after the
  // others are tidied — which is how ?utm_content=test survived alone. A key
  // stripped but not read is worse: it is destroyed before anything stores it.
  const params = SRC.match(/const PARAMS = new Set\(\[([^\]]*)\]\)/);
  assert.ok(params, "could not find PARAMS");
  const keys = params[1].match(/"([a-z_]+)"/g).map((s) => s.replace(/"/g, ""));
  for (const expected of ["utm_source", "utm_medium", "utm_campaign", "utm_content"]) {
    assert.ok(keys.includes(expected), `${expected} is not in PARAMS`);
  }
});

test("PARAMS drives both the read and the strip", () => {
  // One list, two consumers. Two lists would drift into exactly the orphan
  // above.
  const readers = SRC.match(/for \(const k of PARAMS\)/g) || [];
  const strippers = SRC.match(/PARAMS\.has\(/g) || [];
  assert.ok(readers.length >= 1, "readUrlMarkers no longer iterates PARAMS");
  assert.ok(strippers.length >= 1, "stripCampaignParams no longer consults PARAMS");
});
