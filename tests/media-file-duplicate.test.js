const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const CORE = join(
  __dirname,
  "../src/drumee/builtins/media/core.js",
);
const INTERACT = join(
  __dirname,
  "../src/drumee/builtins/media/interact.js",
);

const coreSource = readFileSync(CORE, "utf8");
const interactSource = readFileSync(INTERACT, "utf8");

function extractClassMethod(source, name) {
  const match = new RegExp(`\\n  ${name}\\(`).exec(source);
  assert.ok(match, `${name} not found in production source`);

  const start = match.index + 1;
  const openingBrace = source.indexOf("{", start);
  assert.notEqual(openingBrace, -1, `${name} has no opening brace`);

  let depth = 0;
  for (let i = openingBrace; i < source.length; i += 1) {
    if (source[i] === "{") depth += 1;
    if (source[i] === "}") depth -= 1;
    if (depth === 0) {
      return `function ${source.slice(start, i + 1).trim()}`;
    }
  }

  assert.fail(`${name} has no closing brace`);
}

const names = new Proxy({}, {
  get: (_target, key) => String(key),
});

const contextmenuItemsForFiles = new Function(
  "_a",
  "_e",
  "Visitor",
  `${extractClassMethod(coreSource, "contextmenuItemsForFiles")}
   return contextmenuItemsForFiles;`,
)(names, names, { profile: () => ({ devel: false }) });

function fileTile({ editable, downloadable = true }) {
  const attrs = {
    filetype: "document",
    area: "private",
    status: "active",
  };
  return {
    mget: (key) => attrs[key],
    canOrganize: () => editable,
    isMediaOwner: () => false,
    canDownload: () => downloadable,
    canRemove: () => false,
    getParentByKind: () => null,
    isRegularFile: () => true,
  };
}

test("editable file menu places Duplicate beside Copy and Download", () => {
  const items = contextmenuItemsForFiles.call(fileTile({ editable: true }));

  assert.deepEqual(items.slice(0, 3), ["copy", "duplicate", "download"]);
  assert.equal(items.filter((item) => item === "duplicate").length, 1);
});

test("read-only file menu does not offer Duplicate", () => {
  const items = contextmenuItemsForFiles.call(fileTile({ editable: false }));

  assert.ok(items.includes("copy"));
  assert.ok(items.includes("download"));
  assert.ok(!items.includes("duplicate"));
});

test("file menu stays empty without edit or download permission", () => {
  const items = contextmenuItemsForFiles.call(fileTile({
    editable: false,
    downloadable: false,
  }));

  assert.deepEqual(items, []);
});

function buildDuplicateInPlace(wm) {
  return new Function(
    "_a",
    "SERVICE",
    "Visitor",
    "Wm",
    "LOCALE",
    `${extractClassMethod(interactSource, "duplicateInPlace")}
     return duplicateInPlace;`,
  )(
    names,
    { media: { copy: "media.copy" } },
    { get: () => "echo-123" },
    wm,
    { TRY_AGAIN: "try-again" },
  );
}

test("Duplicate copies once into the current parent and lets live update insert it", async () => {
  const calls = [];
  let unselected = 0;
  const duplicateInPlace = buildDuplicateInPlace({
    unselect: () => { unselected += 1; },
    alert: assert.fail,
  });
  const attrs = {
    nodeId: "node-1",
    pid: "parent-1",
    hub_id: "hub-1",
  };

  await duplicateInPlace.call({
    mget: (key) => attrs[key],
    postService: (...args) => {
      calls.push(args);
      return Promise.resolve({ nid: "copy-1" });
    },
    getLogicalParent: () => assert.fail("HTTP response must not append a tile"),
  });

  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], [
    "media.copy",
    {
      service: "media.copy",
      nid: "node-1",
      pid: "parent-1",
      action: "copy",
      recipient_id: "hub-1",
      hub_id: "hub-1",
      echoId: "echo-123",
    },
    { async: 1 },
  ]);
  assert.equal(unselected, 1);
});

test("Duplicate reports a copy failure", async () => {
  const alerts = [];
  const duplicateInPlace = buildDuplicateInPlace({
    unselect: () => assert.fail("failed copy must not alter selection"),
    alert: (message) => alerts.push(message),
  });

  await duplicateInPlace.call({
    mget: () => "value",
    postService: () => Promise.reject({ reason: "copy failed" }),
  });

  assert.deepEqual(alerts, ["copy failed"]);
});

test("Duplicate handles resolved service errors without changing selection", async () => {
  const alerts = [];
  const duplicateInPlace = buildDuplicateInPlace({
    unselect: () => assert.fail("failed copy must not alter selection"),
    alert: (message) => alerts.push(message),
  });

  await duplicateInPlace.call({
    mget: () => "value",
    postService: () => Promise.resolve({
      error: { message: "copy refused" },
      reason: "copy failed",
    }),
  });

  assert.deepEqual(alerts, ["copy failed"]);
});

test("Duplicate context-menu service delegates to the same-folder copy helper", () => {
  assert.match(
    interactSource,
    /case _a\.duplicate:\s*return this\.duplicateInPlace\(\);/,
  );
});
