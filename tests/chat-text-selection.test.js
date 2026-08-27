#!/usr/bin/env node

const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const source = (path) => readFileSync(join(__dirname, "..", path), "utf8");

function datasetBlock(widgetSource, marker) {
  const start = widgetSource.indexOf(marker);
  assert.notEqual(start, -1, `${marker} not found`);
  const datasetStart = widgetSource.indexOf("dataset:", start);
  assert.notEqual(datasetStart, -1, "dataset block not found");
  const datasetEnd = widgetSource.indexOf("},", datasetStart);
  assert.notEqual(datasetEnd, -1, "dataset block has no closing brace");
  return widgetSource.slice(datasetStart, datasetEnd);
}

test("chat messages form a native text-selection boundary", () => {
  const chatSource = source("src/drumee/builtins/widget/chat/skeleton/index.js");
  const dataset = datasetBlock(chatSource, "const list = Skeletons.List.Smart({");

  assert.match(dataset, /role:\s*_a\.root/);
  assert.doesNotMatch(dataset, /role:\s*_a\.container/);
});

test("chat conversation content remains browser-selectable", () => {
  const conversationSource = source(
    "src/drumee/builtins/widget/chat-item/template/conversation.js",
  );

  assert.match(conversationSource, /class=\"[^\"]*selectable-text/);
});

test("file grids retain their rectangle-selection container", () => {
  const gridSource = source("src/drumee/builtins/window/skeleton/content/grid/index.js");

  assert.match(gridSource, /dataset:\s*\{\s*role:\s*_a\.container/);
});
