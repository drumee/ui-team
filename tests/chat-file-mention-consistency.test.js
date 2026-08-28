#!/usr/bin/env node

const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const chatSource = readFileSync(
  join(__dirname, "../src/drumee/builtins/widget/chat/index.js"),
  "utf8",
);

const attrs = {
  actual_hub_id: "actual_hub_id",
  area: "area",
  audio: "audio",
  closed: "closed",
  folder: "folder",
  home: "home",
  hub: "hub",
  hub_id: "hub_id",
  list: "list",
  name: "name",
  nid: "nid",
  note: "note",
  open: "open",
  pdf: "pdf",
  spinner: "spinner",
};

const services = {
  media: {
    copy: "media.copy",
    make_dir: "media.make_dir",
    move: "media.move",
    relocate: "media.relocate",
    rename: "media.rename",
    restore: "media.restore",
    restore_into: "media.restore_into",
    save: "media.save",
    search_names: "media.search_names",
    show_node_by: "media.show_node_by",
    trash: "media.trash",
    upload: "media.upload",
  },
};

const underscore = {
  escape: (value) => `${value}`,
  isFunction: (value) => typeof value === "function",
  uniqueId: (() => {
    let id = 0;
    return (prefix = "") => `${prefix}${++id}`;
  })(),
};

function getClassMethodSource(name) {
  const signatures = [`  async ${name}(`, `  ${name}(`];
  const starts = signatures
    .map((signature) => chatSource.indexOf(signature))
    .filter((index) => index >= 0);
  if (!starts.length) return "";
  const start = Math.min(...starts);
  const end = chatSource.indexOf("\n  }\n", start);
  assert.notEqual(end, -1, `${name} has no closing brace`);
  return chatSource.slice(start, end + 4).trim();
}

function compileClassMethod(name, overrides = {}) {
  const method = getClassMethodSource(name);
  assert.ok(method, `${name} not found in production source`);
  const isAsync = method.startsWith(`async ${name}(`);
  const prefix = isAsync ? `async ${name}` : name;
  const callable = `${isAsync ? "async " : ""}function ${name}${method.slice(prefix.length)}`;
  const dependencies = {
    _: underscore,
    _a: attrs,
    SERVICE: services,
    Visitor: { id: "viewer", get: () => "viewer" },
    LOCALE: { MENTION_FILES: "Files", PEOPLE: "People" },
    cleanMentionText: (value) => `${value || ""}`,
    mentionMemberDebugRow: (value) => value,
    mentionMemberLabel: () => "",
    mentionMemberSearchText: () => "",
    console: { log() {}, warn() {} },
    RADIO_BROADCAST: { off() {} },
    require,
    setTimeout,
    clearTimeout,
    ...overrides,
  };
  const names = Object.keys(dependencies);
  const values = Object.values(dependencies);
  // Production source is compiled with narrow shims for framework globals.
  // eslint-disable-next-line no-new-func
  return new Function(...names, `return (${callable});`)(...values);
}

function pageFixture(pages, calls, onCall) {
  return async (request) => {
    calls.push({ ...request });
    if (onCall) onCall(request, calls.length);
    const page = request.page || 1;
    return pages[`${request.nid}:${page}`] || [];
  };
}

test("file mention search reaches a matching file beyond page 1", async () => {
  const fetchMentionFiles = compileClassMethod("_fetchMentionFiles");
  const calls = [];
  const chat = {
    fetchService: pageFixture({
      "root:1": [{ nid: "first", filename: "alpha.txt", filetype: "file" }],
      "root:2": [{ nid: "target", filename: "quarterly-report.pdf", filetype: "file" }],
      "root:3": [],
    }, calls),
  };

  const rows = await fetchMentionFiles.call(chat, "actual-hub", "root", "quarterly");

  assert.deepEqual(rows.map(({ nid }) => nid), ["target"]);
  assert.deepEqual(calls.map(({ page }) => page), [1, 2, 3]);
  assert.ok(calls.every(({ sort, order }) => sort === "name" && order === "asc"));
});

test("recursive search discovers a subfolder that itself appears on a later page", async () => {
  const fetchMentionFiles = compileClassMethod("_fetchMentionFiles");
  const calls = [];
  const chat = {
    fetchService: pageFixture({
      "root:1": [{ nid: "first", filename: "alpha.txt", filetype: "file" }],
      "root:2": [{ nid: "nested", filename: "archive", filetype: attrs.folder }],
      "root:3": [],
      "nested:1": [{ nid: "target", filename: "needle.txt", filetype: "file" }],
      "nested:2": [],
    }, calls),
  };

  const rows = await fetchMentionFiles.call(chat, "actual-hub", "root", "needle");

  assert.deepEqual(rows.map(({ nid }) => nid), ["target"]);
  assert.equal(rows[0].mention_path, "archive/needle.txt");
  assert.ok(calls.some(({ nid, page }) => nid === "nested" && page === 1));
});

test("a blank slash pages direct children without traversing subfolders", async () => {
  const fetchMentionFiles = compileClassMethod("_fetchMentionFiles");
  const fetchDirectMentionFiles = compileClassMethod("_fetchDirectMentionFiles");
  const mentionRows = compileClassMethod("_mentionRows");
  const calls = [];
  const chat = {
    _fetchDirectMentionFiles: fetchDirectMentionFiles,
    _mentionRows: mentionRows,
    fetchService: pageFixture({
      "root:1": [
        { nid: "folder", filename: "folder", filetype: attrs.folder },
        { nid: "first", filename: "first.txt", filetype: "file" },
      ],
      "root:2": [{ nid: "second", filename: "second.txt", filetype: "file" }],
      "root:3": [],
      "folder:1": [{ nid: "nested", filename: "nested.txt", filetype: "file" }],
    }, calls),
  };

  const rows = await fetchMentionFiles.call(chat, "hub", "root", "");

  assert.deepEqual(rows.map(({ nid }) => nid), ["folder", "first", "second"]);
  assert.deepEqual(calls.map(({ nid, page }) => `${nid}:${page}`), [
    "root:1",
    "root:2",
    "root:3",
  ]);
});

test("blank slash stops after one page once six rows are renderable", async () => {
  const fetchDirectMentionFiles = compileClassMethod("_fetchDirectMentionFiles");
  const mentionRows = compileClassMethod("_mentionRows");
  const calls = [];
  const chat = {
    _mentionRows: mentionRows,
    fetchService: pageFixture({
      "root:1": Array.from({ length: 6 }, (_, index) => ({
        nid: `file-${index}`,
        filename: `file-${index}.txt`,
        filetype: "file",
      })),
      "root:2": [{ nid: "late", filename: "late.txt", filetype: "file" }],
    }, calls),
  };

  const rows = await fetchDirectMentionFiles.call(chat, "hub", "root");

  assert.equal(rows.length, 6);
  assert.deepEqual(calls.map(({ page }) => page), [1]);
});

test("render limits cannot hide a later exact match behind 80 partial matches", async () => {
  const fetchMentionFiles = compileClassMethod("_fetchMentionFiles");
  const calls = [];
  const firstPage = Array.from({ length: 80 }, (_, index) => ({
    nid: `partial-${index}`,
    filename: `report-${index}.txt`,
    filetype: "file",
  }));
  const chat = {
    fetchService: pageFixture({
      "root:1": firstPage,
      "root:2": [{ nid: "exact", filename: "report-exact.txt", filetype: "file" }],
      "root:3": [],
    }, calls),
  };

  const rows = await fetchMentionFiles.call(chat, "hub", "root", "report");

  assert.ok(rows.some(({ nid }) => nid === "exact"));
  assert.ok(rows.length > 80);
});

test("a repeated non-empty page terminates pagination", async () => {
  const fetchMentionFiles = compileClassMethod("_fetchMentionFiles");
  const calls = [];
  const repeated = [{ nid: "same", filename: "same.txt", filetype: "file" }];
  const chat = {
    fetchService: async (request) => {
      calls.push({ ...request });
      return repeated;
    },
  };

  const rows = await fetchMentionFiles.call(chat, "hub", "root", "same");

  assert.deepEqual(rows.map(({ nid }) => nid), ["same"]);
  assert.equal(calls.length, 2);
});

test("a superseded traversal stops before requesting another page", async () => {
  const fetchMentionFiles = compileClassMethod("_fetchMentionFiles");
  const calls = [];
  let current = true;
  let checks = 0;
  const token = { requestSeq: 4, scopeKey: "hub:root" };
  const chat = {
    _isFileMentionRequestCurrent(candidate) {
      checks += 1;
      assert.equal(candidate, token);
      return current;
    },
    fetchService: pageFixture({
      "root:1": [{ nid: "first", filename: "first.txt", filetype: "file" }],
      "root:2": [{ nid: "late", filename: "late.txt", filetype: "file" }],
    }, calls, () => {
      current = false;
    }),
  };

  await fetchMentionFiles.call(chat, "hub", "root", "late", token);

  assert.ok(checks >= 2);
  assert.equal(calls.length, 1);
});

test("authoritative file scope prefers actual node identity", () => {
  const resolveScope = compileClassMethod("_resolveFileMentionScope");
  const parent = {
    actualNode: () => ({ hub_id: "actual-hub", nid: "actual-folder" }),
    mget(key) {
      return {
        [attrs.actual_hub_id]: "model-actual-hub",
        [attrs.hub_id]: "display-hub",
        [attrs.nid]: "display-folder",
      }[key];
    },
  };
  const chat = {
    hubId: "chat-hub",
    getParentByKind: (kind) => (kind === "window_folder" ? parent : null),
    getScopedNid: () => "scoped-folder",
    mget: () => null,
  };

  assert.deepEqual(resolveScope.call(chat), {
    hubId: "actual-hub",
    nid: "actual-folder",
    key: "actual-hub:actual-folder",
  });
});

test("actual hub identity drives both the list request and rendered marker", async () => {
  const dropdown = {
    dataset: {},
    getBoundingClientRect: () => ({}),
    innerHTML: "",
    offsetParent: {},
    querySelectorAll: () => [],
  };
  const requests = [];
  const scheduled = [];
  const showMentionFiles = compileClassMethod("_showMentionFiles", {
    require: (request) => {
      if (request === "builtins/media/grid/template/preview") return () => "icon";
      throw new Error(`unexpected require: ${request}`);
    },
    setTimeout: (callback) => {
      scheduled.push(callback);
      return scheduled.length;
    },
  });
  const searchMentionFiles = compileClassMethod("_searchMentionFiles");
  const mentionErrorCode = compileClassMethod("_mentionErrorCode");
  const mentionRows = compileClassMethod("_mentionRows");
  const chat = {
    _activeFileMention: null,
    _closeMentionDropdown() {
      this._mentionRequestSeq = (this._mentionRequestSeq || 0) + 1;
      this._activeFileMention = null;
      dropdown.dataset.state = attrs.closed;
      dropdown.innerHTML = "";
    },
    _mentionErrorCode: mentionErrorCode,
    _mentionRows: mentionRows,
    _searchMentionFiles: searchMentionFiles,
    fetchService: async (request) => {
      requests.push(request);
      return [{
        area: "desk",
        filename: "report.pdf",
        filetype: "file",
        hub_id: "actual-hub",
        nid: "file-1",
      }];
    },
    _isFileMentionRequestCurrent: () => true,
    _resolveFileMentionScope: () => ({
      hubId: "actual-hub",
      key: "actual-hub:actual-folder",
      nid: "actual-folder",
    }),
    _setMentionActiveIndex() {},
    fig: { family: "widget-chat" },
    getPart: (name) => (name === "mention-dropdown" ? { el: dropdown } : null),
    hubId: "display-hub",
    mget: () => null,
    warn(error) {
      throw error;
    },
  };

  showMentionFiles.call(chat, "report", "file");
  assert.equal(scheduled.length, 1);
  await scheduled[0]();
  await Promise.resolve();
  await Promise.resolve();

  assert.equal(requests.length, 1);
  assert.equal(requests[0].hub_id, "actual-hub");
  assert.equal(requests[0].nid, "actual-folder");
  assert.equal(requests[0].service, "media.search_names");
  assert.equal(requests[0].limit, 6);
  assert.match(dropdown.innerHTML, /data-hub_id="actual-hub"/);
  assert.match(dropdown.innerHTML, /data-nid="file-1"/);
});

test("canonical search rejects the whole response on a missing or foreign hub", async () => {
  const searchMentionFiles = compileClassMethod("_searchMentionFiles");
  const mentionErrorCode = compileClassMethod("_mentionErrorCode");
  const mentionRows = compileClassMethod("_mentionRows");

  for (const row of [
    { nid: "missing", filename: "missing.txt" },
    { nid: "foreign", filename: "foreign.txt", hub_id: "foreign-hub" },
  ]) {
    const chat = {
      _isFileMentionRequestCurrent: () => true,
      _mentionErrorCode: mentionErrorCode,
      _mentionRows: mentionRows,
      fetchService: async () => [row],
    };
    await assert.rejects(
      searchMentionFiles.call(chat, "actual-hub", "root", "file", {
        requestSeq: 1,
        scopeKey: "actual-hub:root",
      }),
      ({ code }) => code === "MENTION_HUB_MISMATCH",
    );
  }
});

test("resolved search error envelopes fail before row normalization", async () => {
  const searchMentionFiles = compileClassMethod("_searchMentionFiles");
  const mentionErrorCode = compileClassMethod("_mentionErrorCode");
  const mentionRows = compileClassMethod("_mentionRows");
  const chat = {
    _isFileMentionRequestCurrent: () => true,
    _mentionErrorCode: mentionErrorCode,
    _mentionRows: mentionRows,
    fetchService: async () => ({
      data: [{ nid: "unsafe", hub_id: "hub" }],
      error_code: "SEARCH_NAMES_BUSY",
    }),
  };

  await assert.rejects(
    searchMentionFiles.call(chat, "hub", "root", "report", {
      requestSeq: 1,
      scopeKey: "hub:root",
    }),
    ({ code }) => code === "SEARCH_NAMES_BUSY",
  );
});

test("rapid nonblank typing cancels the old timer and makes one final search", async () => {
  const tasks = [];
  let nextId = 1;
  const timers = {
    setTimeout(callback) {
      const task = { callback, cancelled: false, id: nextId++ };
      tasks.push(task);
      return task.id;
    },
    clearTimeout(id) {
      const task = tasks.find((candidate) => candidate.id === id);
      if (task) task.cancelled = true;
    },
  };
  const showMentionFiles = compileClassMethod("_showMentionFiles", {
    ...timers,
    require: (request) => {
      if (request === "builtins/media/grid/template/preview") return () => "icon";
      throw new Error(`unexpected require: ${request}`);
    },
  });
  const closeMentionDropdown = compileClassMethod("_closeMentionDropdown", timers);
  const dropdown = {
    dataset: {},
    getBoundingClientRect: () => ({}),
    innerHTML: "",
    offsetParent: {},
    querySelectorAll: () => [],
  };
  const searches = [];
  const chat = {
    _closeMentionDropdown: closeMentionDropdown,
    _getMentionDropdownEl: () => dropdown,
    _isFileMentionRequestCurrent(token) {
      return this._activeFileMention &&
        this._activeFileMention.requestSeq === token.requestSeq;
    },
    _mentionErrorCode: compileClassMethod("_mentionErrorCode"),
    _mentionRows: compileClassMethod("_mentionRows"),
    _resolveFileMentionScope: () => ({
      hubId: "hub",
      key: "hub:root",
      nid: "root",
    }),
    _searchMentionFiles: async (hubId, nid, filter) => {
      searches.push({ filter, hubId, nid });
      return { rows: [], canonical: true };
    },
    _setMentionActiveIndex() {},
    fig: { family: "widget-chat" },
    getPart: () => ({ el: dropdown }),
    hubId: "hub",
    mget: () => null,
    warn() {},
  };

  showMentionFiles.call(chat, "r", "file");
  showMentionFiles.call(chat, "report", "file");
  assert.equal(tasks.filter(({ cancelled }) => !cancelled).length, 1);
  await tasks.find(({ cancelled }) => !cancelled).callback();
  await Promise.resolve();
  await Promise.resolve();

  assert.deepEqual(searches, [{ filter: "report", hubId: "hub", nid: "root" }]);
});

test("only the typed unsupported context uses the recursive listing fallback", async () => {
  for (const [code, expectedFallbacks] of [
    ["SEARCH_NAMES_UNSUPPORTED_CONTEXT", 1],
    ["SEARCH_NAMES_BUSY", 0],
    ["SEARCH_NAMES_TIMEOUT", 0],
    ["SEARCH_NAMES_PROJECTION_NOT_READY", 0],
  ]) {
    const scheduled = [];
    const showMentionFiles = compileClassMethod("_showMentionFiles", {
      setTimeout: (callback) => {
        scheduled.push(callback);
        return scheduled.length;
      },
      require: (request) => {
        if (request === "builtins/media/grid/template/preview") return () => "icon";
        throw new Error(`unexpected require: ${request}`);
      },
    });
    const dropdown = {
      dataset: {},
      getBoundingClientRect: () => ({}),
      innerHTML: "",
      offsetParent: {},
      querySelectorAll: () => [],
    };
    let fallbacks = 0;
    let warnings = 0;
    const chat = {
      _closeMentionDropdown({ preserveFileQuery = false } = {}) {
        this._mentionRequestSeq = (this._mentionRequestSeq || 0) + 1;
        if (!preserveFileQuery) this._activeFileMention = null;
        dropdown.dataset.state = attrs.closed;
        dropdown.innerHTML = "";
      },
      _fetchMentionFiles: async () => {
        fallbacks += 1;
        return [];
      },
      _isFileMentionRequestCurrent: () => true,
      _mentionErrorCode: compileClassMethod("_mentionErrorCode"),
      _mentionRows: compileClassMethod("_mentionRows"),
      _resolveFileMentionScope: () => ({
        hubId: "hub",
        key: "hub:root",
        nid: "root",
      }),
      _searchMentionFiles: async () => {
        const error = new Error(code);
        error.code = code;
        throw error;
      },
      _setMentionActiveIndex() {},
      fig: { family: "widget-chat" },
      getPart: () => ({ el: dropdown }),
      hubId: "hub",
      mget: () => null,
      warn() { warnings += 1; },
    };

    showMentionFiles.call(chat, "report", "file");
    await scheduled[0]();
    await Promise.resolve();
    await Promise.resolve();

    assert.equal(fallbacks, expectedFallbacks, code);
    if (code !== "SEARCH_NAMES_UNSUPPORTED_CONTEXT") {
      assert.equal(warnings, 1, `${code} should remain observable`);
    }
  }
});

test("secure-share fallback keeps subtree and page fan-out bounded", async () => {
  const fetchMentionFiles = compileClassMethod("_fetchMentionFiles");
  const calls = [];
  const chat = {
    fetchService: async (request) => {
      calls.push({ ...request });
      if (request.nid !== "root") return [];
      return [{
        nid: `folder-${request.page || 1}`,
        filename: `folder-${request.page || 1}`,
        filetype: attrs.folder,
      }];
    },
  };

  const rows = await fetchMentionFiles.call(
    chat,
    "hub",
    "root",
    "needle",
    undefined,
    { boundedFallback: true },
  );

  assert.deepEqual(rows, []);
  assert.ok(calls.length <= 200, `page cap exceeded: ${calls.length}`);
  assert.ok(
    new Set(calls.map(({ nid }) => nid)).size <= 40,
    "folder cap exceeded",
  );
});

test("all media membership and name aliases invalidate file suggestions", () => {
  const isMutation = compileClassMethod("_isFileMentionMutation");
  const aliases = [
    "media.new",
    "media.remove",
    "media.make_dir",
    "media.upload",
    "media.replace",
    "media.copy",
    "media.move",
    "media.relocate",
    "media.workspace_move",
    "media.rename",
    "media.trash",
    "media.restore",
    "media.restore_into",
    "media.purge",
    "media.save",
  ];

  for (const service of aliases) {
    assert.equal(isMutation.call({}, service), true, service);
  }
  assert.equal(isMutation.call({}, "channel.post"), false);
});

test("mutation clears stale rows immediately and debounces one scoped refetch", () => {
  const tasks = [];
  let nextId = 1;
  const timers = {
    clearTimeout(id) {
      const task = tasks.find((candidate) => candidate.id === id);
      if (task) task.cancelled = true;
    },
    setTimeout(callback) {
      const task = { callback, cancelled: false, id: nextId++ };
      tasks.push(task);
      return task.id;
    },
  };
  const refresh = compileClassMethod("_refreshFileMentionsAfterMutation", timers);
  const active = {
    filter: "report",
    hubId: "hub",
    nid: "root",
    scopeKey: "hub:root",
  };
  const closes = [];
  const shows = [];
  const chat = {
    _activeFileMention: active,
    _closeMentionDropdown(options) {
      closes.push(options);
      if (!options || !options.preserveFileQuery) this._activeFileMention = null;
    },
    _isFileMentionMutation: () => true,
    _resolveFileMentionScope: () => ({ hubId: "hub", nid: "root", key: "hub:root" }),
    _showMentionFiles(filter, type) {
      shows.push({ filter, type });
    },
    isDestroyed: () => false,
  };

  refresh.call(chat, "media.rename", { hub_id: "hub" });
  refresh.call(chat, "media.new", { hub_id: "hub" });

  assert.equal(closes.length, 2, "each event immediately closes selectable rows");
  assert.ok(closes.every(({ preserveFileQuery }) => preserveFileQuery));
  assert.equal(tasks.filter(({ cancelled }) => !cancelled).length, 1);
  tasks.find(({ cancelled }) => !cancelled).callback();
  assert.deepEqual(shows, [{ filter: "report", type: "file" }]);
});

test("a wholly foreign workspace mutation leaves active suggestions alone", () => {
  const scheduled = [];
  const refresh = compileClassMethod("_refreshFileMentionsAfterMutation", {
    setTimeout: (callback) => {
      scheduled.push(callback);
      return scheduled.length;
    },
  });
  let closes = 0;
  const chat = {
    _activeFileMention: {
      filter: "report",
      hubId: "current-hub",
      nid: "root",
      scopeKey: "current-hub:root",
    },
    _closeMentionDropdown: () => { closes += 1; },
    _isFileMentionMutation: () => true,
    _resolveFileMentionScope: () => ({
      hubId: "current-hub",
      nid: "root",
      key: "current-hub:root",
    }),
  };

  refresh.call(chat, "media.move", {
    args: {
      src: { hub_id: "foreign-source" },
      dest: { hub_id: "foreign-destination" },
    },
  });

  assert.equal(closes, 0);
  assert.equal(scheduled.length, 0);
});

test("a cross-hub mutation invalidates when its source is the active workspace", () => {
  const scheduled = [];
  const refresh = compileClassMethod("_refreshFileMentionsAfterMutation", {
    setTimeout: (callback) => {
      scheduled.push(callback);
      return scheduled.length;
    },
  });
  let closes = 0;
  const chat = {
    _activeFileMention: {
      filter: "report",
      hubId: "current-hub",
      nid: "root",
      scopeKey: "current-hub:root",
    },
    _closeMentionDropdown: () => { closes += 1; },
    _isFileMentionMutation: () => true,
    _resolveFileMentionScope: () => ({
      hubId: "current-hub",
      nid: "root",
      key: "current-hub:root",
    }),
  };

  refresh.call(chat, "media.move_all", {
    hub_id: "foreign-destination",
    args: {
      src: { hub_id: "current-hub" },
      dest: { hub_id: "foreign-destination" },
    },
  });

  assert.equal(closes, 1);
  assert.equal(scheduled.length, 1);
});

test("an ambiguous batch mutation invalidates despite a foreign destination", () => {
  const scheduled = [];
  const refresh = compileClassMethod("_refreshFileMentionsAfterMutation", {
    setTimeout: (callback) => {
      scheduled.push(callback);
      return scheduled.length;
    },
  });
  let closes = 0;
  const chat = {
    _activeFileMention: {
      filter: "report",
      hubId: "current-hub",
      nid: "root",
      scopeKey: "current-hub:root",
    },
    _closeMentionDropdown: () => { closes += 1; },
    _isFileMentionMutation: () => true,
    _resolveFileMentionScope: () => ({
      hubId: "current-hub",
      nid: "root",
      key: "current-hub:root",
    }),
  };

  refresh.call(chat, "media.move_all", {
    args: {
      src: [{ hub_id: "current-hub" }],
      dest: { hub_id: "foreign-destination" },
    },
  });

  assert.equal(closes, 1);
  assert.equal(scheduled.length, 1);
});

test("closing the dropdown cancels delayed refresh state", () => {
  const cleared = [];
  const close = compileClassMethod("_closeMentionDropdown", {
    clearTimeout: (id) => cleared.push(id),
  });
  const dropdown = { dataset: {}, innerHTML: "stale" };
  const chat = {
    _activeFileMention: { filter: "old" },
    _getMentionDropdownEl: () => dropdown,
    _mentionQueryCancel: () => cleared.push("query-promise"),
    _mentionQueryTimer: 19,
    _mentionRefreshTimer: 17,
    _mentionRequestSeq: 4,
  };

  close.call(chat);

  assert.deepEqual(cleared, [19, "query-promise", 17]);
  assert.equal(chat._mentionQueryTimer, null);
  assert.equal(chat._mentionQueryCancel, null);
  assert.equal(chat._mentionRefreshTimer, null);
  assert.equal(chat._activeFileMention, null);
  assert.equal(chat._mentionRequestSeq, 5);
  assert.equal(dropdown.innerHTML, "");
  assert.equal(dropdown.dataset.state, attrs.closed);
});

test("folder navigation and contact reload close active mention state", async () => {
  const setScopedFolderNid = compileClassMethod("setScopedFolderNid");
  const reload = compileClassMethod("reload");
  let closes = 0;
  const list = {
    mget: () => false,
    mset() {},
    restart() {},
  };
  const chat = {
    _closeMentionDropdown: () => { closes += 1; },
    _unfreezeIfScopeChanged() {},
    ensurePart: async () => list,
    hubId: "old-hub",
    mset() {},
    peerId: "old-peer",
    scopedNid: "old-folder",
  };

  setScopedFolderNid.call(chat, "new-folder");
  reload.call(chat, {
    model: {
      toJSON: () => ({ hub_id: "new-hub", drumate_id: "new-peer" }),
    },
  });
  await Promise.resolve();

  assert.equal(closes, 2);
});

test("destroy and contact search explicitly cancel file mention lifecycle", () => {
  const destroySource = getClassMethodSource("onBeforeDestroy");
  const showSource = getClassMethodSource("_showMentionFiles");
  const wsSource = getClassMethodSource("onWsMessage");

  assert.match(destroySource, /_closeMentionDropdown\(\)/);
  assert.match(showSource, /_closeMentionDropdown\(\)/);
  assert.match(wsSource, /_refreshFileMentionsAfterMutation\(liveService, data\)/);
});
