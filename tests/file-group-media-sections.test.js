// file-group-media-sections.test.js — the Media tab splits its grid into
// Images / Videos / Audio; every other tab keeps its old layout.
//
//   node --test tests/file-group-media-sections.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const {
  GROUP_ORDER,
  mediaGroupOf,
  sectionsFor,
  bucketByGroup,
  blocksGroupedArrange,
  setGrouped,
  clearGrouped,
} = require("../src/drumee/builtins/window/skeleton/toolkit/file-group");

let seq = 0;
function windowWith(filter, grouped) {
  const ui = { cid: `w${++seq}`, _filterType: filter };
  setGrouped(ui, grouped);
  return ui;
}

test("each media kind has its section; svg is an image, stream a video", () => {
  assert.equal(mediaGroupOf({ filetype: "image" }), "media-image");
  assert.equal(mediaGroupOf({ filetype: "vector" }), "media-image");
  assert.equal(mediaGroupOf({ filetype: "video" }), "media-video");
  assert.equal(mediaGroupOf({ filetype: "stream" }), "media-video");
  assert.equal(mediaGroupOf({ filetype: "audio" }), "media-audio");
  assert.equal(mediaGroupOf({ filetype: "document" }), "media-other");
  assert.equal(mediaGroupOf(), "media-other");
});

test("the Media tab is split in Grid and in Group view alike", () => {
  for (const grouped of [false, true]) {
    const ui = windowWith("image", grouped);
    const sections = sectionsFor(ui);
    assert.deepEqual(sections.order, [
      "media-image",
      "media-video",
      "media-audio",
      "media-other",
    ]);
    assert.equal(sections.label["media-video"], "VIDEOS");
    clearGrouped(ui);
  }
});

test("other tabs keep their layout: plain in Grid, by type in Group view", () => {
  for (const filter of [null, "docs", "pdf", "other"]) {
    assert.equal(sectionsFor(windowWith(filter, false)), null);
    const grouped = windowWith(filter, true);
    assert.deepEqual(sectionsFor(grouped).order, GROUP_ORDER);
    clearGrouped(grouped);
  }
});

test("bucketing follows the section set, in its order", () => {
  const ui = windowWith("image", false);
  const items = ["video", "image", "audio", "vector", "weird"].map(
    (filetype) => ({ filetype }),
  );
  const buckets = bucketByGroup(items, mediaGroupOf, sectionsFor(ui));
  assert.deepEqual(
    [...buckets].map(([key, list]) => [key, list.length]),
    [
      ["media-image", 2],
      ["media-video", 1],
      ["media-audio", 1],
      ["media-other", 1],
    ],
  );
  // The Group-view default is untouched.
  assert.deepEqual([...bucketByGroup([]).keys()], GROUP_ORDER);
});

test("hand-arranging is refused while the Media tab is split", () => {
  assert.equal(blocksGroupedArrange(windowWith("image", false), {}, true), true);
  assert.equal(blocksGroupedArrange(windowWith("image", false), { over: 1 }, true), false);
  assert.equal(blocksGroupedArrange(windowWith(null, false), {}, true), false);
});
