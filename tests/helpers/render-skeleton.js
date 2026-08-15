// Render the REAL task-panel skeleton into a plain tree so tests can assert
// against markup the panel actually produces.
//
// Every hand-built fixture in this suite has, at least once, been green while
// the shipped markup was wrong: data-comment-id existed only on the edit-mode
// row, and the normal row had no drop overlay. A fixture cannot see either.
// This can.
const Module = require("node:module");

// Descriptor factory: keeps props verbatim and normalises children to `kids`.
const node = (kind) => (props = {}) => ({ __kind: kind, ...props });

function installGlobals() {
  const saved = {};
  const set = (k, v) => {
    saved[k] = global[k];
    global[k] = v;
  };

  const Box = node("box");
  set("Skeletons", {
    Box: Object.assign(node("box"), {
      X: Box, Y: Box, Z: Box, G: Box,
    }),
    Note: node("note"),
    Element: node("element"),
    Entry: node("entry"),
    Textarea: node("textarea"),
    Button: { Svg: node("button.svg"), Label: node("button.label") },
    Image: { Svg: node("image.svg") },
    UserProfile: node("profile"),
    Wrapper: Object.assign(node("wrapper"), { Y: node("wrapper"), X: node("wrapper") }),
    FileSelector: node("fileselector"),
  });
  set("LOCALE", new Proxy({}, { get: (_t, k) => String(k) }));
  set("Visitor", {
    id: "me",
    get: () => "",
    isMobile: () => false,
    device: () => "desktop",
  });
  const dayjs = () => ({
    format: () => "Jan 1",
    isBefore: () => false,
    isSame: () => false,
    isValid: () => true,
    add: () => dayjs(),
    valueOf: () => 0,
    fromNow: () => "just now",
    startOf: () => dayjs(),
    endOf: () => dayjs(),
    diff: () => 0,
    date: () => 1,
    month: () => 0,
    year: () => 2026,
    day: () => 1,
    unix: () => 0,
  });
  dayjs.unix = () => dayjs();
  set("Dayjs", dayjs);
  set("_a", new Proxy({}, { get: (_t, k) => String(k) }));
  set("_e", new Proxy({}, { get: (_t, k) => String(k) }));
  set("_K", { order: { descending: "desc" }, char: { empty: "" }, tag: { div: "div" } });
  set("bootstrap", () => ({ endpoint: "", keysel: "" }));
  set("_", require("lodash"));
  // A few descriptors touch the DOM while building (date pickers, editors).
  const stubEl = () => ({
    style: {},
    dataset: {},
    classList: { add() {}, remove() {}, contains: () => false },
    appendChild() {},
    setAttribute() {},
    querySelector: () => null,
    querySelectorAll: () => [],
  });
  if (typeof global.document === "undefined") {
    set("document", {
      createElement: stubEl,
      createTextNode: () => ({}),
      querySelector: () => null,
      querySelectorAll: () => [],
      body: stubEl(),
    });
  }
  if (typeof global.window === "undefined") {
    set("window", { innerHeight: 900, innerWidth: 1440, getSelection: () => null });
  }
  return () => {
    for (const k of Object.keys(saved)) {
      if (saved[k] === undefined) delete global[k];
      else global[k] = saved[k];
    }
  };
}

// webpack aliases `media/...` and `libs/...`; stub them for node.
function installResolver() {
  const orig = Module._resolveFilename;
  Module._resolveFilename = function (request, ...rest) {
    if (/^media\//.test(request) || /^libs\//.test(request) || /^assets\//.test(request)) {
      return require.resolve("./alias-stub.js");
    }
    return orig.call(this, request, ...rest);
  };
  return () => {
    Module._resolveFilename = orig;
  };
}

const DEFAULT_COMMENT = {
  id: "c1",
  task_id: "t1",
  author_uid: "me",
  body: "hello",
  ctime: 0,
  reactions: [],
  attachments: [],
};

function makeUi(over = {}) {
  const cols = [
    { key: "todo", name: "To do", theme: "default", color: "#AEAEB2", is_done: 0, position: 0, custom: 1 },
  ];
  const base = {
    fig: { family: "tasks-panel" },
    mget: () => null,
    getState: () => ({ todo: [] }),
    getColumns: () => cols,
    getColumnThemes: () => ({ default: "#AEAEB2" }),
    isDoneStatus: () => false,
    isColumnWatched: () => false,
    getBoardModalState: () => ({ open: false, theme: "default", title: "", isDefault: true }),
    getColMenuFor: () => null,
    getColRenameDraft: () => null,
    getPriorities: () => [{ key: "medium", label: "PRIORITY_MEDIUM", color: "#71A3F4" }],
    getMembers: () => [{ id: "me", firstname: "Me", lastname: "You" }],
    getMember: () => ({ firstname: "Me", lastname: "You" }),
    getLabels: () => [],
    getLabel: () => null,
    getKnownAssignees: () => [],
    getFilterUids: () => [],
    getFilters: () => ({ keyword: "", priority: [], status: [], due: null, files: null }),
    isFilterCatOpen: () => false,
    isFilterDimActive: () => false,
    isFilterActive: () => false,
    getView: () => "board",
    getSort: () => null,
    getCalMode: () => "month",
    getCalCursor: () => null,
    getGanttMode: () => "weeks",
    getGanttSelected: () => new Set(),
    isCreating: () => false,
    getCreateDraft: () => null,
    getPickerOpen: () => null,
    getFileSearch: () => ({ query: "", results: [], scope: null, page: 1, hasMore: false }),
    getDetailTask: () => null,
    getDetailDraft: () => null,
    getDetailAttachments: () => [],
    getComments: () => [],
    getEditingCommentId: () => null,
    getReplyingTo: () => null,
    getReactPickerFor: () => null,
    getCommentDraft: () => null,
    getCommentEditDraft: () => null,
    getReplyDraft: () => null,
    getActivityTab: () => "comments",
    getTaskHistory: () => [],
    getRowUploads: () => [],
  };
  return { ...base, ...over };
}

// Render and return the descriptor tree.
function render(over = {}) {
  const restoreGlobals = installGlobals();
  const restoreResolver = installResolver();
  try {
    const path = require.resolve(
      "../../src/drumee/builtins/window/tasks/skeleton/index.js",
    );
    delete require.cache[path];
    const make = require(path);
    return make(makeUi(over));
  } finally {
    restoreResolver();
    restoreGlobals();
  }
}

// Depth-first walk over `kids`.
function* walk(n) {
  if (!n || typeof n !== "object") return;
  yield n;
  for (const k of [].concat(n.kids || [])) yield* walk(k);
}

const hasClass = (n, cls) =>
  typeof n.className === "string" && n.className.split(/\s+/).includes(cls);

function find(tree, cls) {
  for (const n of walk(tree)) if (hasClass(n, cls)) return n;
  return null;
}

function findAll(tree, cls) {
  const out = [];
  for (const n of walk(tree)) if (hasClass(n, cls)) out.push(n);
  return out;
}

// Direct children only — the overlay skin rules use `>`.
const childrenWithClass = (n, cls) =>
  [].concat((n && n.kids) || []).filter((k) => k && hasClass(k, cls));

module.exports = { render, walk, find, findAll, hasClass, childrenWithClass, DEFAULT_COMMENT };

// Descriptor tree → HTML, so a browser can lay out what the skeleton really
// emits. Only the attributes layout and hit-testing depend on.
function toHtml(n) {
  if (n == null || typeof n !== "object") return "";
  const cls = n.className ? ` class="${n.className}"` : "";
  const attrs = Object.entries(n.attrOpt || {})
    .filter(([, v]) => v != null)
    .map(([k, v]) => ` ${k}="${String(v)}"`)
    .join("");
  const ds = Object.entries(n.dataset || {})
    .filter(([, v]) => v != null)
    .map(([k, v]) => ` data-${k}="${String(v)}"`)
    .join("");
  const kids = [].concat(n.kids || []).map(toHtml).join("");
  const text = n.content != null && !kids ? String(n.content) : "";
  return `<div${cls}${attrs}${ds}>${text}${kids}</div>`;
}
module.exports.toHtml = toHtml;
