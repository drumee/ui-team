// chat-details-model.test.js — pure helpers behind the folder Chat details
// panel (Figma 775:131699).
//
//   node --test tests/chat-details-model.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const dayjs = require("dayjs");
const relativeTime = require("dayjs/plugin/relativeTime");
dayjs.extend(relativeTime);
global.Dayjs = dayjs;
const en = require("../locale/en.json");
global.LOCALE = new Proxy(en, { get: (t, k) => (k in t ? t[k] : k) });
String.prototype.format = function (...a) {
  return String(this).replace(/\{(\d+)\}/g, (_, i) => a[i]);
};

const M = require("../src/drumee/builtins/widget/chat-details/model");

test("count labels pluralise per page", () => {
  assert.equal(M.countLabel(752, "photo"), "752 photos");
  assert.equal(M.countLabel(1, "photo"), "1 photo");
  assert.equal(M.countLabel(33, "video"), "33 videos");
  assert.equal(M.countLabel(175, "file"), "175 files");
  assert.equal(M.countLabel(721, "link"), "721 shared links");
  assert.equal(M.countLabel(0, "link"), "0 shared links");
});

test("videos group by month, newest first, year only when it differs", () => {
  const now = dayjs("2026-09-27T12:00:00");
  const rows = [
    { nid: "a", ctime: dayjs("2026-09-20").unix() },
    { nid: "b", ctime: dayjs("2026-08-02").unix() },
    { nid: "c", ctime: dayjs("2026-09-01").unix() },
    { nid: "d", ctime: dayjs("2025-12-11").unix() },
  ];
  const g = M.groupByMonth(rows, now);
  assert.deepEqual(g.map((x) => x.label), ["September", "August", "December 2025"]);
  assert.deepEqual(g[0].rows.map((r) => r.nid), ["a", "c"]);
});

test("last seen: online wins, then relative time, 0 reads 'recently'", () => {
  const now = dayjs("2026-09-27T12:00:00").unix();
  assert.deepEqual(M.lastSeenLabel({ online: 1, last_seen: 0 }, now), { text: en.CD_ONLINE, online: true });
  assert.deepEqual(M.lastSeenLabel({ online: 0, last_seen: 0 }, now), { text: en.CD_LAST_SEEN_RECENTLY, online: false });
  assert.equal(M.lastSeenLabel({ online: 0, last_seen: now - 8 * 60 }, now).text, "last seen 8 minutes ago");
  assert.equal(M.lastSeenLabel({ online: "0", last_seen: now - 2 * 3600 }, now).text, "last seen 2 hours ago");
});

test("duration pill", () => {
  assert.equal(M.durationLabel(32), "0:32");
  assert.equal(M.durationLabel("75"), "1:15");
  assert.equal(M.durationLabel(3605), "1:00:05");
  assert.equal(M.durationLabel(null), "");
  assert.equal(M.durationLabel("abc"), "");
});

test("extractUrl stops at HTML and quotes", () => {
  assert.equal(M.extractUrl('see <a href="https://x.io/a">x</a>'), "https://x.io/a");
  assert.equal(M.extractUrl("plain https://y.io/b?q=1 ok"), "https://y.io/b?q=1");
  assert.equal(M.extractUrl("no link"), "");
  assert.equal(M.extractUrl(null), "");
});

test("members de-duplicated by id, first kept", () => {
  const out = M.uniqueMembers([{ id: "a", online: 1 }, { id: "b" }, { id: "a", online: 0 }]);
  assert.deepEqual(out.map((m) => m.id), ["a", "b"]);
  assert.equal(out[0].online, 1);
});

test("generation: only the latest request is current", () => {
  const g = M.generation();
  const first = g.next();
  const second = g.next();
  assert.equal(g.isCurrent(first), false);
  assert.equal(g.isCurrent(second), true);
});

test("thumbUrl: vignette for photos/videos, orig for vectors, keysel unless public", () => {
  const boot = { endpoint: "/-/", keysel: "k1" };
  assert.equal(M.thumbUrl({ nid: "n1", category: "image" }, "h1", boot), "/-/file/vignette/n1/h1?keysel=k1");
  assert.equal(M.thumbUrl({ nid: "n2", category: "vector" }, "h1", boot), "/-/file/orig/n2/h1?keysel=k1");
  assert.equal(M.thumbUrl({ nid: "n3", category: "video" }, "h1", { endpoint: "/-/" }), "/-/file/vignette/n3/h1");
  assert.equal(M.thumbUrl({ nid: "n4", category: "image", area: "public" }, "h1", boot), "/-/file/vignette/n4/h1");
  assert.equal(M.thumbUrl({ category: "image" }, "h1", boot), "");
});

// A direct conversation's attachments live in their SENDER's wicket hub: the
// tile must address the row's own hub, not the panel's.
test("thumbUrl prefers the row's hub_id", () => {
  const boot = { endpoint: "/-/", keysel: "" };
  assert.equal(M.thumbUrl({ nid: "n1", hub_id: "hSender", category: "image" }, "hPanel", boot), "/-/file/vignette/n1/hSender");
  assert.equal(M.thumbUrl({ nid: "n1", category: "image" }, "hPanel", boot), "/-/file/vignette/n1/hPanel");
});
