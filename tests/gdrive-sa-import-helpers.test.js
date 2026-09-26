// Pure helpers of the share-to-SA controller: error wording, progress maths,
// result summary and the client-side file log. Shared by the popup and the
// tour's live dialog, so the two can never word or count differently.
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

global.LOCALE = {
  GDRIVE_SA_NOT_SHARED: "not shared",
  GDRIVE_SA_NOT_OWNER: "not owner",
  GDRIVE_SA_NEEDS_GOOGLE: "needs google",
  GDRIVE_SA_BAD_LINK: "bad link",
  GDRIVE_SA_NOT_A_FOLDER: "not a folder",
  MIGRATE_GDRIVE_SOURCE_REVOKED: "revoked",
  TRY_AGAIN: "try again",
};
const G = require(path.join(__dirname, "../src/drumee/libs/gdrive-sa-import.js"));

test.after(() => { delete global.LOCALE; });

test("errorText maps every SA code", () => {
  assert.equal(G.errorText("SA_NOT_SHARED"), "not shared");
  assert.equal(G.errorText("SA_NOT_OWNER"), "not owner");
  assert.equal(G.errorText("SA_NEEDS_GOOGLE"), "needs google");
  assert.equal(G.errorText("SA_BAD_LINK"), "bad link");
  assert.equal(G.errorText("SA_NOT_A_FOLDER"), "not a folder");
  assert.equal(G.errorText("START_FAILED"), "try again");
});

test("errorText: revoked source anywhere in the reason, unknown falls back", () => {
  assert.equal(G.errorText("409 SOURCE_ACCESS_REVOKED on start"), "revoked");
  assert.equal(G.errorText("SOMETHING_ELSE"), "not shared");
  assert.equal(G.errorText(undefined), "not shared");
});

test("progressOf: every file counted is 100", () => {
  assert.equal(G.progressOf({ total_files: 4, processed_files: 4, bytes_total: 100, bytes_done: 10 }).pct, 100);
});

test("progressOf: follows bytes and holds under 100", () => {
  assert.equal(G.progressOf({ total_files: 4, processed_files: 1, bytes_total: 200, bytes_done: 50, bytes_in_flight: 50 }).pct, 50);
  assert.equal(G.progressOf({ total_files: 4, processed_files: 3, bytes_total: 100, bytes_done: 100 }).pct, 99);
});

test("progressOf: counts only when no sizes, 0 when empty", () => {
  assert.equal(G.progressOf({ total_files: 4, processed_files: 1 }).pct, 25);
  assert.deepEqual(G.progressOf({}), { pct: 0, done: 0, total: 0, bytesSeen: 0, bytesTotal: 0 });
});

test("summaryOf separates skipped shortcuts from failures", () => {
  const s = G.summaryOf({
    processed_files: 7, total_folders: 2,
    errors: [{ code: "SHORTCUT_SKIPPED" }, { code: "NOT_GRANTED" }, { code: "SHORTCUT_SKIPPED" }],
  });
  assert.equal(s.processed, 7);
  assert.equal(s.folders, 2);
  assert.equal(s.skipped.length, 2);
  assert.equal(s.failures.length, 1);
});

test("trackFileLog: new name flips the previous entry to done", () => {
  let log = G.trackFileLog([], { current_filename: "a.txt", status: "running" });
  log = G.trackFileLog(log, { current_filename: "b.txt", status: "running" });
  assert.deepEqual(log, [{ name: "a.txt", status: "done" }, { name: "b.txt", status: "uploading" }]);
});

test("trackFileLog: same name twice is one entry; finish closes the tail", () => {
  let log = G.trackFileLog([], { current_filename: "a", status: "running" });
  log = G.trackFileLog(log, { current_filename: "a", status: "running" });
  assert.equal(log.length, 1);
  log = G.trackFileLog(log, { current_filename: "a", status: "done" });
  assert.deepEqual(log, [{ name: "a", status: "done" }]);
});

test("trackFileLog: capped at 12, input untouched", () => {
  let log = [];
  for (let i = 0; i < 15; i++) log = G.trackFileLog(log, { current_filename: `f${i}`, status: "running" });
  assert.equal(log.length, 12);
  assert.equal(log[0].name, "f3");
  const before = [{ name: "x", status: "uploading" }];
  G.trackFileLog(before, { current_filename: "y", status: "running" });
  assert.deepEqual(before, [{ name: "x", status: "uploading" }]);
});
