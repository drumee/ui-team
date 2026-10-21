// file-switcher-save-before-switch.test.js — switching file in the Open-File
// Switcher saves the file being left first, and a save that fails keeps the
// user on that file.
//
//   node --test tests/file-switcher-save-before-switch.test.js
//
// The panel closes the viewer it sits in the way the X button does
// (goodbye), and the editors never saved on close: markdown, text and the
// diagram only saved on the floppy icon, docs and sheet lost what was typed
// since their last autosave (its timer is dropped on destroy). Each editor
// now exposes saveBeforeClose(), which switchTo awaits before opening the
// next file.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { sliceFunction } = require("./helpers/slice-method");

const root = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

const SWITCHER = read("src/drumee/builtins/player/widget/file-switcher/index.js");
const SRC = {
  docs: read("src/drumee/builtins/editor/docs/index.js"),
  sheet: read("src/drumee/builtins/editor/sheet/index.js"),
  markdown: read("src/drumee/builtins/editor/markdow/index.js"),
  text: read("src/drumee/builtins/player/text/index.js"),
  note: read("src/drumee/builtins/editor/note/index.js"),
  diagram: read("src/drumee/builtins/editor/diagram/index.js"),
  diagramState: read("src/drumee/builtins/editor/diagram/state.js"),
};

const _a = { web: "web" };
const fn = (src, signature, scope = {}) =>
  new Function(...Object.keys(scope), `return (${sliceFunction(src, signature)})`)(...Object.values(scope));

/** A panel stub around `player`, recording what switchTo does. */
function panel(player, calls) {
  return {
    el: { dataset: {} },
    _recent: [],
    _scope: { nid: "f" },
    _folder: [],
    player,
    node: () => ({ nid: "old" }),
    getPart: () => null,
    fetchService() {},
    warn(msg) {
      calls.push(["warn", msg]);
    },
    isDestroyed: () => false,
    renderLists() {},
    waitForPlayer: async () => true,
    openInTab() {
      calls.push(["openInTab"]);
    },
    switchTo: fn(SWITCHER, "async switchTo(nid, hub_id, filetype)", {
      openMedia: async (data) => {
        calls.push(["openMedia", data]);
        return true;
      },
      recent: { forget() {} },
      _a,
      handoff: null,
    }),
    saveBeforeSwitch: fn(SWITCHER, "async saveBeforeSwitch()"),
  };
}

const editor = (saveBeforeClose, calls) => ({
  isDestroyed: () => false,
  goodbye() {
    calls.push(["goodbye"]);
  },
  saveBeforeClose,
});

test("switchTo saves the editor being left before opening the next file", async () => {
  const calls = [];
  const ui = panel(
    editor(async () => {
      calls.push(["saveBeforeClose"]);
      return true;
    }, calls),
    calls,
  );
  await ui.switchTo("new", "h");
  assert.deepEqual(
    calls.map((c) => c[0]),
    ["saveBeforeClose", "openMedia", "goodbye"],
  );
  assert.equal(ui._switching, 0);
});

test("a save that fails keeps the user on the file: nothing opens, the panel is idle again", async () => {
  const calls = [];
  const ui = panel(editor(async () => false, calls), calls);
  await ui.switchTo("new", "h");
  assert.deepEqual(calls, []);
  assert.equal(ui._switching, 0);
  assert.equal(ui.el.dataset.busy, 0);
});

test("a save that throws is logged and stops the switch too", async () => {
  const calls = [];
  const ui = panel(
    editor(async () => {
      throw new Error("export failed");
    }, calls),
    calls,
  );
  await ui.switchTo("new", "h");
  assert.deepEqual(
    calls.map((c) => c[0]),
    ["warn"],
  );
  assert.equal(ui._switching, 0);
});

test("a viewer with nothing to save (video, image) switches as before", async () => {
  const calls = [];
  const ui = panel({ isDestroyed: () => false, goodbye: () => calls.push(["goodbye"]) }, calls);
  await ui.switchTo("new", "h");
  assert.deepEqual(
    calls.map((c) => c[0]),
    ["openMedia", "goodbye"],
  );
});

test("the next player inherits the folder window the editors save into (target), unless it is gone", async () => {
  let calls = [];
  const folder = { isDestroyed: () => false };
  const opened = () => calls.find((c) => c[0] === "openMedia");
  let ui = panel({ ...editor(async () => true, calls), target: folder }, calls);
  await ui.switchTo("new", "h");
  assert.deepEqual(opened(), ["openMedia", { nid: "new", hub_id: "h", target: folder }]);

  calls = [];
  ui = panel({ ...editor(async () => true, calls), target: { isDestroyed: () => true } }, calls);
  await ui.switchTo("new", "h");
  assert.equal(opened()[1].target, undefined);
});

// ---------------------------------------------------------------- editors

for (const name of ["docs", "sheet"]) {
  const key = name === "docs" ? "_doc" : "_sheet";
  test(`${name}: saveBeforeClose drops the pending autosave, saves now, waits for a save in flight`, async () => {
    const saveBeforeClose = fn(SRC[name], "async saveBeforeClose()");
    let saves = 0;
    const self = {
      _changed: 1,
      _saving: 0,
      [key]: { _saveTimer: 42 },
      async saveContent() {
        saves++;
        this._changed = 0;
      },
      saveBeforeClose,
    };
    assert.equal(await self.saveBeforeClose(), true);
    assert.equal(saves, 1);
    assert.equal(self[key]._saveTimer, null);

    // Nothing typed: no save at all.
    self._changed = 0;
    assert.equal(await self.saveBeforeClose(), true);
    assert.equal(saves, 1);

    // The save did not go through: the caller must keep the editor open.
    self._changed = 1;
    self.saveContent = async () => {
      saves++;
    };
    assert.equal(await self.saveBeforeClose(), false);

    // An autosave already in flight finishes first, then the rest is saved.
    self._saving = 1;
    setTimeout(() => {
      self._saving = 0;
    }, 150);
    self.saveContent = async function () {
      saves++;
      this._changed = 0;
    };
    assert.equal(await self.saveBeforeClose(), true);
    assert.equal(saves, 3);
  });
}

for (const name of ["markdown", "text"]) {
  test(`${name}: saveBeforeClose saves when something was typed, reports a save that did not go through`, async () => {
    const saveBeforeClose = fn(SRC[name], "async saveBeforeClose()");
    let saves = 0;
    const self = {
      _changed: 1,
      async saveContent() {
        saves++;
        this._changed = 0;
      },
      saveBeforeClose,
    };
    assert.equal(await self.saveBeforeClose(), true);
    assert.equal(saves, 1);
    self._changed = 0;
    assert.equal(await self.saveBeforeClose(), true);
    assert.equal(saves, 1);
    self._changed = 1;
    self.saveContent = () => {
      saves++;
    };
    assert.equal(await self.saveBeforeClose(), false);
  });
}

test("note: saveBeforeClose waits for the save the editor already did on close", async () => {
  const saveBeforeClose = fn(SRC.note, "async saveBeforeClose()");
  let changed = 1;
  let saves = 0;
  const self = {
    __textContent: { hasBeenChanged: (v) => (v === 0 ? (changed = 0) : changed) },
    async saveContent() {
      saves++;
      changed = 0;
    },
    saveBeforeClose,
  };
  assert.equal(await self.saveBeforeClose(), true);
  assert.equal(saves, 1);
  assert.equal(await self.saveBeforeClose(), true);
  assert.equal(saves, 1);
});

test("diagram: saveBeforeClose saves a modified diagram and trusts the server, not the click", async () => {
  const saveBeforeClose = fn(SRC.diagram, "async saveBeforeClose()");
  let saves = 0;
  const state = {
    _diagram: { isModified: true },
    async save() {
      saves++;
      this._diagram.isModified = false;
    },
  };
  const self = { _diagram: state, saveBeforeClose };
  assert.equal(await self.saveBeforeClose(), true);
  assert.equal(saves, 1);
  assert.equal(await self.saveBeforeClose(), true);
  assert.equal(saves, 1);
  state._diagram.isModified = true;
  state.save = async () => {
    saves++;
  };
  assert.equal(await self.saveBeforeClose(), false);
  // Modified is cleared by the server's answer, not by the click.
  assert.match(SRC.diagramState, /if \(data && data\.nid\) this\._diagram\.isModified = false;/);
  assert.match(SRC.diagramState, /return this\.postService\(opt, \{ async: 1 \}\)\n\s+\.then/);
});

test("the saves can be awaited: every editor hands its request back", () => {
  for (const name of ["docs", "sheet", "markdown", "text"]) {
    assert.match(SRC[name], /_saveContent\(opt, target(?:, stamp)?\) \{\n\s+const saving = this\.postService\(/, name);
    assert.match(SRC[name], /this\._savePromise = saving;\n\s+return saving;/, name);
  }
  assert.match(SRC.docs, /return this\._saveContent\(opt, target, stamp\);/);
  assert.match(SRC.sheet, /return this\._saveContent\(opt, target\);/);
  assert.match(SRC.markdown, /return this\._saveContent\(opt, this\.target\)\n/);
  assert.match(SRC.text, /return this\._saveContent\(opt, target\);/);
  assert.match(SRC.note, /return this\.postService\(opt, \{ async: 1 \}\)\.then\(\(data\) => \{\n\s+let \[file\] = target\.getItemsByAttr/);
  // docs / sheet: the create-then-replace follow-up is part of the same wait.
  assert.match(SRC.docs, /if \(!opt\.replace\) return this\.saveContent\(\);/);
  assert.match(SRC.sheet, /if \(!opt\.replace\) \{\n\s+return this\.saveContent\(\);/);
});

// ---------------------------------------------------------------- X button

const INTERACT = read("src/drumee/builtins/player/interact.js");

test("X button: an editor saves first and closes once the server has it; a viewer closes at once", async () => {
  const closeAfterSave = fn(INTERACT, "async closeAfterSave()", { Wm: {}, LOCALE: {} });
  let calls = [];
  const viewer = { isDestroyed: () => false, goodbye: () => calls.push("goodbye"), warn() {}, closeAfterSave };
  await viewer.closeAfterSave();
  assert.deepEqual(calls, ["goodbye"]);

  calls = [];
  const editor = {
    ...viewer,
    async saveBeforeClose() {
      calls.push("save");
      return true;
    },
  };
  await editor.closeAfterSave();
  assert.deepEqual(calls, ["save", "goodbye"]);
});

test("X button: a save that fails asks before closing, and a No keeps the editor open", async () => {
  let answer = { response: "confirm" };
  let asked = 0;
  const closeAfterSave = fn(INTERACT, "async closeAfterSave()", {
    Wm: { confirm: async () => (asked++, answer) },
    LOCALE: { UNSAVED_CLOSE_ANYWAY: "close anyway?" },
  });
  let calls = [];
  const editor = {
    isDestroyed: () => false,
    goodbye: () => calls.push("goodbye"),
    warn: () => calls.push("warn"),
    saveBeforeClose: async () => false,
    closeAfterSave,
  };
  await editor.closeAfterSave();
  assert.equal(asked, 1);
  assert.deepEqual(calls, ["goodbye"]);

  calls = [];
  answer = { response: "cancel" };
  await editor.closeAfterSave();
  assert.deepEqual(calls, []);

  // A save that throws is logged and lands on the same question.
  calls = [];
  answer = { response: "confirm" };
  editor.saveBeforeClose = async () => {
    throw new Error("export failed");
  };
  await editor.closeAfterSave();
  assert.deepEqual(calls, ["warn", "goodbye"]);
});

test("every editor's close button goes through closeAfterSave; the question exists in the six locales", () => {
  for (const name of ["docs", "sheet", "markdown", "text", "note"]) {
    assert.match(SRC[name], /case _e\.close:\n\s+return this\.closeAfterSave\(\);/, name);
  }
  // The diagram editor inherits the base player's close case.
  assert.match(INTERACT, /case _e\.close:\n\s+return this\.closeAfterSave\(\);/);
  assert.doesNotMatch(SRC.diagram, /case _e\.close/);
  for (const lang of ["en", "es", "fr", "km", "ru", "zh"]) {
    const l = JSON.parse(read(`locale/${lang}.json`));
    assert.ok(l.UNSAVED_CLOSE_ANYWAY && l.UNSAVED_CLOSE_ANYWAY.length > 10, lang);
  }
});

test("text viewer: typing marks the file unsaved (it had no such flag)", () => {
  assert.match(SRC.text, /child\.el\.addEventListener\("input", \(\) => \{\n\s+this\._changed = 1;/);
  // The flag is read by the switch and cleared by a save that returned a node.
  assert.match(SRC.text, /if \(!data \|\| !data\.nid\) \{[^}]+\}\n\s+this\._changed = 0;/);
});
