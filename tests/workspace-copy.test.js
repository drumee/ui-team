#!/usr/bin/env node

/**
 * Make a copy on a WORKSPACE goes to media.copy_workspace — and ONLY on a real
 * one.
 *
 * WHY THE ROW WAS DEAD. media.copy cannot duplicate a workspace and never
 * could: mfs_copy_all's root insert filters `category <> 'hub'`, so the hub
 * root matches nothing, the walk never starts and the plan comes back empty.
 * Sent with the workspace's own scope it answered 403 — `scope: hub` resolves
 * the request INTO that workspace's database and looks for the hub node in
 * there, while the node actually lives on the user's DESK. Correcting the scope
 * only turned the loud 403 into a silent 200 that created nothing, which is
 * worse; the row needed a service, and now has one.
 *
 * THE SAME TRAP AS move(). media/grid initContainer() raises `isHub` on any
 * node whose `hubs` attribute is non-empty, so a FOLDER that merely contains
 * workspaces carries it too. Routed through `isHub`, this branch would send a
 * folder's duplicate to the workspace service. It keys on `filetype`.
 *
 * Run from ui-team with:
 *   node --test tests/workspace-copy.test.js
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const REPO_ROOT = join(__dirname, "..");
const read = (p) => readFileSync(join(REPO_ROOT, p), "utf8");

const INTERACT = read("src/drumee/builtins/media/interact.js");
const LOCALE_EN = JSON.parse(read("locale/en.json"));

// `.format` is an app-provided String extension (ui-essentials), absent in
// plain node. Stub it as the app behaves, or the method under test throws
// where it composes its dialog.
if (typeof String.prototype.format !== "function") {
  // eslint-disable-next-line no-extend-native
  String.prototype.format = function (...args) {
    return this.replace(/\{(\d+)\}/g, (m, i) => (args[i] === undefined ? m : args[i]));
  };
}

function slice(src, header) {
  const start = src.indexOf(header);
  assert.notEqual(start, -1, `${header} not found`);
  const open = src.indexOf("{", start + header.length - 1);
  let depth = 0;
  for (let j = open; j < src.length; j++) {
    if (src[j] === "{") depth++;
    else if (src[j] === "}" && --depth === 0) return src.slice(start, j + 1);
  }
  assert.fail(`${header} unbalanced`);
}

function method(src, header, globals) {
  const body = slice(src, header);
  const names = Object.keys(globals);
  const name = header.replace(/^async\s+/, "").split("(")[0].trim();
  // eslint-disable-next-line no-new-func
  return new Function(...names, `return ({ ${body} }).${name};`)(
    ...names.map((n) => globals[n]),
  );
}

const _a = { hub_id: "hub_id", filename: "filename", filetype: "filetype", hub: "hub" };

// ── the branch ─────────────────────────────────────────────────────────────

test("duplicateInPlace routes to the workspace path on filetype, not isHub", () => {
  const body = slice(INTERACT, "  duplicateInPlace() {");
  assert.match(
    body,
    /if \(this\.mget\(_a\.filetype\) === _a\.hub\) \{\s*\n\s*return this\._copyWorkspace\(\);/,
    "the workspace branch must be decided on filetype",
  );
  assert.ok(
    !/if \(this\.isHub\)\s*\{\s*\n\s*return this\._copyWorkspace\(/.test(body),
    "must NOT gate on isHub — a folder containing workspaces sets it too",
  );
  // The file/folder path must survive untouched underneath.
  assert.match(body, /service: SERVICE\.media\.copy,/, "the node copy must remain");
});

// ── what the workspace path sends and says ─────────────────────────────────

function runCopy(opt = {}) {
  const posted = []; const said = []; const alerted = [];
  const item = {
    mget(k) {
      if (k === _a.hub_id) return "hubId" in opt ? opt.hubId : "WORKSPACE_A";
      if (k === _a.filename) return opt.name || "Workspace A";
      return null;
    },
    warn() {},
    postService(payload) {
      posted.push(payload);
      if (opt.reject) return Promise.reject(opt.reject);
      return Promise.resolve(opt.response || {
        status: "COPIED", hub_id: "NEW", filename: "Workspace A-copy",
        requested: 3, copied: 3,
      });
    },
  };
  const globals = {
    _a,
    LOCALE: LOCALE_EN,
    SERVICE: { media: {} },
    Butler: { say: (m) => said.push(m) },
    Wm: {
      alert: (m) => { alerted.push(m); },
      confirm: () => (opt.cancel ? Promise.reject({}) : Promise.resolve()),
    },
  };
  const fn = method(INTERACT, "async _copyWorkspace() {", globals);
  return fn.call(item).then(() => ({ posted, said, alerted }));
}

test("asks the service for THIS workspace and nothing else", async () => {
  const { posted } = await runCopy();
  assert.equal(posted.length, 1);
  assert.deepEqual(posted[0], {
    service: "media.copy_workspace",
    hub_id: "WORKSPACE_A",
  });
});

test("a cancelled confirmation posts nothing and says nothing", async () => {
  const { posted, alerted, said } = await runCopy({ cancel: true });
  assert.equal(posted.length, 0);
  assert.equal(alerted.length, 0, "cancelling is not a failure");
  assert.equal(said.length, 0);
});

test("posts nothing when the item carries no workspace id", async () => {
  const { posted, alerted } = await runCopy({ hubId: null });
  assert.equal(posted.length, 0);
  assert.equal(alerted[0], LOCALE_EN.COPY_WORKSPACE_FAILED);
});

test("an empty source is SPOKEN, not passed off as a plain success", async () => {
  const { alerted, said } = await runCopy({
    response: { status: "COPIED", hub_id: "NEW", filename: "A-copy", requested: 0, copied: 0 },
  });
  assert.equal(alerted.length, 1);
  assert.equal(said.length, 0);
});

test("a partial copy is SPOKEN, not passed off as a plain success", async () => {
  const { alerted, said } = await runCopy({
    response: { status: "COPIED", hub_id: "NEW", filename: "A-copy", requested: 3, copied: 2 },
  });
  assert.equal(alerted.length, 1);
  assert.equal(said.length, 0);
});

test("a response without a new workspace id is a failure, never a success", async () => {
  const { alerted, said } = await runCopy({ response: { status: "COPIED", requested: 1, copied: 1 } });
  assert.equal(said.length, 0, "no hub_id means nothing was created");
  assert.equal(alerted.length, 1);
});

test("a complete copy is announced once", async () => {
  const { alerted, said } = await runCopy();
  assert.equal(alerted.length, 0);
  assert.equal(said.length, 1);
});

// ── the strings ────────────────────────────────────────────────────────────

test("every LOCALE key the copy path uses exists", () => {
  for (const k of [
    "COPY_WORKSPACE_TITLE", "COPY_WORKSPACE_CONFIRM", "COPY_WORKSPACE_KEEPS",
    "COPY_WORKSPACE_DONE", "COPY_WORKSPACE_EMPTY", "COPY_WORKSPACE_PARTIAL",
    "COPY_WORKSPACE_FAILED", "MAKE_A_COPY", "WORKSPACE",
  ]) {
    assert.ok(LOCALE_EN[k], `locale/en.json is missing ${k}`);
  }
});

test("the confirmation says what is NOT copied, members included", () => {
  const keeps = LOCALE_EN.COPY_WORKSPACE_KEEPS;
  for (const word of ["Chat", "tasks", "meetings", "share links", "members", "only member"]) {
    assert.ok(keeps.includes(word), `the confirmation must mention ${word}`);
  }
});

test("the confirmation promises the source is untouched", () => {
  assert.match(
    LOCALE_EN.COPY_WORKSPACE_CONFIRM,
    /not changed/i,
    "a copy leaves the source alone and the text must say so",
  );
});
