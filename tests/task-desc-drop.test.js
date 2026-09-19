// Dropping a file on a task DESCRIPTION.
//
// Until now the description refused every drop: resolveZone had no entry for
// it, so the pointer resolved to nothing and window/tasks/index.js stamped
// `dropEffect = "none"` — a deliberate refusal, documented in the dragover
// handler. This adds the zone, and the whole of the new decision lives in
// drop-zones.js, which is pure: an element, a prefix and a two-method context.
// So it is tested directly, against a DOM small enough to read.
//
// Two things make this worth a test rather than a glance:
//
//   1. THE FALL-THROUGH. The three comment editors are mention editors too. A
//      zone that matched them would steal a drop from the composer and the
//      reply box, which own it today. What keeps them out is that they pass
//      their own `editorClass` and so never carry `__desc-editor` — and that
//      is a fact about skeleton/index.js, not about drop-zones.js, which is
//      why the second half of this file renders the REAL skeleton to check it.
//      The unknown-scope case is tested anyway: it must fall through to the
//      zone that encloses it, NOT refuse like a foreign comment row does.
//
//   2. THE SCOPE. `detail` and `create` are one selector apart from each
//      other — both are `__desc-editor` — so the scope has to ride an
//      attribute. sys_pn never reaches the DOM (it is read with mget), hence
//      data-desc-scope.
const test = require("node:test");
const assert = require("node:assert");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { resolveZone } = require("../src/drumee/builtins/window/tasks/drop-zones.js");
const { render, walk } = require("./helpers/render-skeleton.js");

const PFX = "tasks-panel";

// ── A DOM with exactly as much as resolveZone touches ──────────────────
//
// `closest` over a parent chain, matching the two selector shapes the ZONES
// table uses: ".cls" and ".cls[attr]". Anything else is a typo in the table
// and should fail loudly rather than silently match nothing.
const SEL = /^\.([A-Za-z0-9_-]+)(?:\[([A-Za-z0-9_-]+)\])?$/;

function el(className, attrs = {}, kids = []) {
  const node = {
    className,
    attrs,
    parentNode: null,
    getAttribute: (k) => (k in attrs ? attrs[k] : null),
    closest(sel) {
      const m = SEL.exec(sel);
      assert.ok(m, `unsupported selector in ZONES: ${sel}`);
      const [, cls, attr] = m;
      let n = this;
      while (n) {
        const classes = String(n.className || "").split(/\s+/);
        if (classes.includes(cls) && (!attr || n.getAttribute(attr) != null)) {
          return n;
        }
        n = n.parentNode;
      }
      return null;
    },
  };
  for (const k of kids) k.parentNode = node;
  return node;
}

// Everything is inside the panel, and `me` owns every comment, unless a test
// says otherwise.
const ctx = (over = {}) => ({
  contains: () => true,
  isOwnComment: () => true,
  ...over,
});

const descEditor = (scope) =>
  el(`${PFX}__desc-editor`, scope == null ? {} : { "data-desc-scope": scope });

test("a drop on the detail description resolves the detail desc zone", () => {
  const editor = descEditor("detail");
  el(`${PFX}__detail-row`, {}, [editor]);

  const zone = resolveZone(PFX, editor, ctx());
  assert.ok(zone, "the description must now accept a drop");
  assert.equal(zone.scope, "desc");
  assert.equal(zone.descScope, "detail");
  assert.equal(zone.key, "desc:detail");
  // The zone carries its own element so the lit affordance and the resolved
  // scope cannot drift apart — the reason resolveZone returns `el` at all.
  assert.equal(zone.el, editor);
});

test("a drop on the create-modal description resolves the create desc zone", () => {
  const editor = descEditor("create");
  el(`${PFX}__create-field-grow`, {}, [editor]);

  const zone = resolveZone(PFX, editor, ctx());
  assert.equal(zone.scope, "desc");
  assert.equal(zone.descScope, "create");
  assert.equal(zone.key, "desc:create");
});

test("a drop on a CHILD of the description still resolves the editor", () => {
  // An inline image or a mention chip is a real element inside the editor, and
  // a drop lands on whichever one is under the pointer.
  const chip = el(`${PFX}__mention-chip`);
  const editor = el(
    `${PFX}__desc-editor`,
    { "data-desc-scope": "detail" },
    [chip],
  );
  el(`${PFX}__detail-row`, {}, [editor]);

  const zone = resolveZone(PFX, chip, ctx());
  assert.equal(zone.descScope, "detail");
  assert.equal(zone.el, editor, "the zone element is the editor, not the chip");
});

test("a desc editor with an unknown scope FALLS THROUGH to its enclosing zone", () => {
  // The refusal rule is not the comment-row rule. A foreign comment row refuses
  // outright, because nothing above it legitimately owns the drop. A mention
  // editor is different: it sits inside a composer that does own it, so an
  // unrecognised scope must keep looking rather than swallow the drop.
  const editor = descEditor("something-new");
  const composer = el(`${PFX}__comment-composer`, {}, [editor]);
  assert.ok(composer);

  const zone = resolveZone(PFX, editor, ctx());
  assert.ok(zone, "must not refuse — the composer owns this drop");
  assert.equal(zone.scope, "comment");
});

test("a desc editor with NO scope attribute falls through too", () => {
  const editor = descEditor(null);
  el(`${PFX}__comment-composer`, {}, [editor]);

  const zone = resolveZone(PFX, editor, ctx());
  assert.equal(zone && zone.scope, "comment");
});

// ── The zones that already existed keep working ────────────────────────

test("the existing zones are unchanged", () => {
  const cases = [
    [`${PFX}__comment-replybox`, {}, "comment-reply", "comment-reply"],
    [`${PFX}__comment-composer`, {}, "comment", "comment"],
    [`${PFX}__attachments`, {}, "detail", "detail"],
    [`${PFX}__create-files`, {}, "create", "create"],
  ];
  for (const [cls, attrs, scope, key] of cases) {
    const n = el(cls, attrs);
    const zone = resolveZone(PFX, n, ctx());
    assert.equal(zone && zone.scope, scope, `${cls} -> ${scope}`);
    assert.equal(zone && zone.key, key);
  }

  const row = el(`${PFX}__comment-row`, { "data-comment-id": "c1" });
  const rowZone = resolveZone(PFX, row, ctx());
  assert.equal(rowZone.scope, "comment-row");
  assert.equal(rowZone.key, "comment-row:c1");
  assert.equal(rowZone.commentId, "c1");
});

test("someone else's comment row is still refused outright", () => {
  const row = el(`${PFX}__comment-row`, { "data-comment-id": "c1" });
  const zone = resolveZone(PFX, row, ctx({ isOwnComment: () => false }));
  assert.equal(zone, null);
});

test("a pointer on panel chrome still refuses", () => {
  assert.equal(resolveZone(PFX, el(`${PFX}__viewbar`), ctx()), null);
});

test("an element outside the panel is refused even if it matches", () => {
  const editor = descEditor("detail");
  const zone = resolveZone(PFX, editor, ctx({ contains: () => false }));
  assert.equal(zone, null);
});

// ── The skeleton half: which editors carry the hook ────────────────────
//
// resolveZone can only be right about scope if the markup agrees, and the
// markup is what decides that the three comment editors are out of scope:
// they pass their own editorClass, so they never carry __desc-editor at all.
// A fixture cannot see that — this renders the shipped skeleton.

const DRAFT = {
  title: "t",
  description: "",
  mention_uids: [],
  due_date: "",
  start_date: "",
  duration_on: false,
  status: "todo",
  priority: "medium",
  reporter_uid: "me",
  assignees: [],
  labels: [],
  pending_files: [],
};

const editors = (tree) => {
  const out = [];
  for (const n of walk(tree)) {
    const cls = String(n.className || "");
    if (/__desc-editor|__comment-input|__comment-reply-input|__comment-edit-input/.test(cls)) {
      out.push({ cls, scope: (n.attrOpt || {})["data-desc-scope"] });
    }
  }
  return out;
};

test("the detail description editor carries its scope", () => {
  const tree = render({
    getDetailTask: () => ({ id: "t1", title: "t", status: "todo", created_by: "me" }),
    getDetailDraft: () => DRAFT,
  });
  const desc = editors(tree).filter((e) => /__desc-editor/.test(e.cls));
  assert.equal(desc.length, 1, "the detail panel draws one description editor");
  assert.equal(desc[0].scope, "detail");
});

test("the create-modal description editor carries its scope", () => {
  const tree = render({
    isCreating: () => true,
    getCreateDraft: () => ({ ...DRAFT, subtasks: [] }),
  });
  const desc = editors(tree).filter((e) => /__desc-editor/.test(e.cls));
  assert.equal(desc.length, 1);
  assert.equal(desc[0].scope, "create");
});

test("the comment editors do NOT carry __desc-editor", () => {
  // This is what keeps them out of the new zone. If a future edit drops the
  // custom editorClass, the composer's drop silently changes meaning — from
  // "ride the comment draft, commit on Send" to "inline into the body".
  const tree = render({
    getDetailTask: () => ({ id: "t1", title: "t", status: "todo", created_by: "me" }),
    getDetailDraft: () => DRAFT,
  });
  const found = editors(tree);
  const comment = found.filter((e) => !/__desc-editor/.test(e.cls));
  assert.ok(comment.length >= 1, "the detail panel draws a comment composer");
  for (const c of comment) {
    assert.ok(
      !/__desc-editor/.test(c.cls),
      `${c.cls} must not carry __desc-editor — it would join the desc zone`,
    );
  }
});

// ── The panel half: what the resolved zone is then USED for ────────────
//
// The panel is a 10 000-line class that needs the whole runtime to
// instantiate, so — as tests/call-tile-drag.test.js and
// tests/workspace-delete-admin-only.test.js do — the methods are cut out of
// the SOURCE FILE and run against a fake `this`. They therefore test the
// shipped text: rename one of these or change the split and this fails.
const PANEL = resolve(
  __dirname,
  "../src/drumee/builtins/window/tasks/index.js",
);
const panelSrc = readFileSync(PANEL, "utf8");

// One method, by name. Methods sit at two-space indent and close with a "  }"
// on its own line, which is what bounds the slice.
function method(name) {
  const head = new RegExp(`\\n  (?:async )?${name}\\(`).exec(panelSrc);
  assert.ok(head, `method ${name} not found in ${PANEL}`);
  const from = head.index + 1;
  const end = panelSrc.indexOf("\n  }\n", from);
  assert.ok(end > from, `method ${name} is not closed as expected`);
  return panelSrc.slice(from, end + "\n  }\n".length);
}

const Panel = new Function(
  `return class { ${[
    "_dropOnDescEditor",
    "_isDroppableImage",
    "_splitFilename",
    "_isImageExt",
    "_rememberDropScope",
    "_pasteZone",
  ]
    .map(method)
    .join("\n")} }`,
)();

const file = (name, type) => ({ name, type, __file: 1 });

// A panel with the calls _dropOnDescEditor makes recorded rather than run.
//
// The two image seams are recorded separately because the split between them
// is load-bearing: `placed` is what the user sees IMMEDIATELY (synchronous),
// `settled` is the upload behind it.
function panel(over = {}) {
  const p = new Panel();
  p.calls = { attached: [], placed: [], settled: [] };
  p._attachFilesToZone = async (zone, files) => {
    p.calls.attached.push({ zone, files });
  };
  p._beginInlineImage = (f, scope, el, range) => {
    p.calls.placed.push({ file: f, scope, el, range });
    return { __placeholderFor: f };
  };
  p._settleInlineImage = async (ph, f, scope, el) => {
    p.calls.settled.push({ ph, file: f, scope, el });
  };
  return Object.assign(p, over);
}

const EDITOR = { isConnected: true };
const descZone = (scope = "detail", range = { r: 1 }) => ({
  scope: "desc",
  key: `desc:${scope}`,
  descScope: scope,
  el: EDITOR,
  range,
});

test("an image dropped on the description goes INTO it, at the drop point", async () => {
  const p = panel();
  const png = file("shot.png", "image/png");
  await p._dropOnDescEditor(descZone(), [png]);

  assert.equal(p.calls.attached.length, 0, "an image must not be attached");
  assert.equal(p.calls.placed.length, 1);
  const ins = p.calls.placed[0];
  assert.equal(ins.file, png);
  assert.equal(ins.scope, "detail", "inlines against the editor's own scope");
  assert.equal(ins.el, EDITOR);
  assert.deepEqual(ins.range, { r: 1 }, "the drop point is carried through");
  assert.equal(p.calls.settled.length, 1, "and its upload is then run");
});

test("a non-image dropped on the description attaches to the task instead", async () => {
  const p = panel();
  const pdf = file("report.pdf", "application/pdf");
  await p._dropOnDescEditor(descZone(), [pdf]);

  assert.equal(p.calls.placed.length, 0, "nothing goes into the body");
  assert.equal(p.calls.attached.length, 1);
  // The zone it attaches with is the FORM's, not the desc zone — otherwise
  // _draftForKey would be handed "desc:detail" and find no draft.
  assert.deepEqual(p.calls.attached[0].zone, { scope: "detail", key: "detail" });
  assert.deepEqual(p.calls.attached[0].files, [pdf]);
});

test("a video attaches, exactly as a pasted one does", async () => {
  const p = panel();
  await p._dropOnDescEditor(descZone(), [file("clip.mp4", "video/mp4")]);
  assert.equal(p.calls.placed.length, 0);
  assert.equal(p.calls.attached.length, 1);
});

test("a mixed drop splits: images in, the rest beside", async () => {
  const p = panel();
  const png = file("a.png", "image/png");
  const pdf = file("b.pdf", "application/pdf");
  const jpg = file("c.jpg", "image/jpeg");
  await p._dropOnDescEditor(descZone("create"), [png, pdf, jpg]);

  assert.deepEqual(p.calls.attached[0].files, [pdf], "only the non-images");
  assert.deepEqual(
    p.calls.placed.map((i) => i.file),
    [png, jpg],
    "images land in the order they were dropped",
  );
  for (const i of p.calls.placed) assert.equal(i.scope, "create");
});

test("an editor torn out mid-upload stops the rest of the batch", async () => {
  const p = panel();
  const el = { isConnected: true };
  p._settleInlineImage = async () => {
    el.isConnected = false; // the task was switched while this one uploaded
    p.calls.settled.push({});
  };
  await p._dropOnDescEditor(
    { scope: "desc", descScope: "detail", el, range: null },
    [file("a.png", "image/png"), file("b.png", "image/png")],
  );
  assert.equal(p.calls.settled.length, 1, "the second upload is abandoned");
});

test("a zone with no element or no scope does nothing at all", async () => {
  const p = panel();
  await p._dropOnDescEditor({ scope: "desc", descScope: "detail" }, [file("a.png", "image/png")]);
  await p._dropOnDescEditor({ scope: "desc", el: EDITOR }, [file("a.png", "image/png")]);
  assert.equal(p.calls.placed.length, 0);
  assert.equal(p.calls.attached.length, 0);
});

test("an image is recognised by type first, by extension only when there is none", () => {
  const p = panel();
  assert.equal(p._isDroppableImage(file("a.png", "image/png")), true);
  assert.equal(p._isDroppableImage(file("a.webp", "image/webp")), true);
  // No type at all — a drag out of an archive or off a share.
  assert.equal(p._isDroppableImage(file("a.png", "")), true);
  assert.equal(p._isDroppableImage(file("a.PNG", undefined)), true);
  assert.equal(p._isDroppableImage(file("a.pdf", "")), false);
  // A DECLARED type is taken at its word, so a mislabelled file attaches
  // rather than rendering as a broken inline image.
  assert.equal(p._isDroppableImage(file("a.png", "application/pdf")), false);
  assert.equal(p._isDroppableImage(null), false);
});

test("a desc zone is never REMEMBERED for the positionless route", () => {
  // Same rule as detail/create: a task surface is recoverable from the
  // pointer, and remembering it would let a stale hover write with no
  // overlay ever shown.
  const p = panel();
  p._rememberDropScope(descZone());
  assert.equal(p._lastDropScope, null);

  p._rememberDropScope({ scope: "comment-row", key: "comment-row:c1", commentId: "c1" });
  assert.deepEqual(p._lastDropScope, {
    scope: "comment-row",
    key: "comment-row:c1",
    commentId: "c1",
  });

  p._rememberDropScope(descZone("create"));
  assert.equal(p._lastDropScope, null, "and it clears a remembered one");
});

test("a PASTE over the description is left to the composer, as before", () => {
  // Pasting INTO the description never reaches here — the caret is in a
  // contenteditable, so _onPasteAttach returns early and _onEditorPaste
  // inlines at the caret. This is the other case: the caret is elsewhere and
  // only the pointer is over the editor.
  const p = panel({
    _lastPointer: { x: 10, y: 10 },
    _dropPointEl: () => ({}),
    _activeUploadScope: () => descZone(),
    _detailId: "t1",
    _mayWriteTasks: () => true,
  });
  assert.deepEqual(p._pasteZone(), { scope: "comment", key: "comment" });
});

test("a paste over any OTHER zone still claims it", () => {
  const zone = { scope: "comment-row", key: "comment-row:c1", commentId: "c1" };
  const p = panel({
    _lastPointer: { x: 10, y: 10 },
    _dropPointEl: () => ({}),
    _activeUploadScope: () => zone,
    _detailId: "t1",
    _mayWriteTasks: () => true,
  });
  assert.equal(p._pasteZone(), zone);
});

// ── Loading state for an inline image ─────────────────────────────────
//
// An image dropped or pasted into a description uploads before it can be
// shown, and until now NOTHING appeared during those seconds — the drop read
// as one that had been ignored. _beginInlineImage puts a placeholder in at
// once and _settleInlineImage swaps it for the real image, or turns it red
// with a retry.
//
// The thing that most needs proving is not the spinner. It is that the
// placeholder CANNOT REACH THE SAVED BODY: _onDescInput serializes the editor
// on every keystroke, and a placeholder is not something the marker grammar
// can express. So the real _serializeEditor is run over an editor holding one.

// A DOM with what these methods touch, and nothing else.
function fakeDom() {
  const revoked = [];
  let seq = 0;
  const mk = (tag) => {
    const n = {
      tagName: String(tag).toUpperCase(),
      nodeType: 1,
      childNodes: [],
      parentNode: null,
      style: {},
      dataset: {},
      attrs: {},
      className: "",
      listeners: [],
      get classList() {
        const own = () => String(n.className || "").split(/\s+/).filter(Boolean);
        return {
          contains: (c) => own().includes(c),
        };
      },
      get isConnected() {
        let p = n;
        while (p) {
          if (p.__root) return true;
          p = p.parentNode;
        }
        return false;
      },
      get textContent() {
        return n.childNodes
          .map((c) => (c.nodeType === 3 ? c.textContent : c.textContent))
          .join("");
      },
      setAttribute: (k, v) => {
        n.attrs[k] = String(v);
      },
      getAttribute: (k) => (k in n.attrs ? n.attrs[k] : null),
      appendChild: (c) => {
        c.parentNode = n;
        n.childNodes.push(c);
        return c;
      },
      contains: (o) => {
        let p = o;
        while (p) {
          if (p === n) return true;
          p = p.parentNode;
        }
        return false;
      },
      remove: () => {
        const p = n.parentNode;
        if (!p) return;
        p.childNodes.splice(p.childNodes.indexOf(n), 1);
        n.parentNode = null;
      },
      replaceWith: (x) => {
        const p = n.parentNode;
        if (!p) return;
        p.childNodes.splice(p.childNodes.indexOf(n), 1, x);
        x.parentNode = p;
        n.parentNode = null;
      },
      querySelector: (sel) => {
        const want = sel.toUpperCase();
        const hunt = (m) => {
          for (const c of m.childNodes) {
            if (c.tagName === want) return c;
            const deep = hunt(c);
            if (deep) return deep;
          }
          return null;
        };
        return hunt(n);
      },
      addEventListener: (ev, fn) => n.listeners.push({ ev, fn }),
      // Fire a click as the browser would, with `target` set to a descendant.
      __click(target) {
        const e = {
          target: {
            ...target,
            classList: target.classList,
            closest: () => target,
          },
          preventDefault() {},
          stopPropagation() {},
        };
        for (const l of n.listeners) if (l.ev === "click") l.fn(e);
      },
    };
    return n;
  };
  const text = (s) => ({ nodeType: 3, textContent: s, childNodes: [] });
  return {
    mk,
    text,
    revoked,
    document: {
      createElement: mk,
      createRange: () => null,
    },
    URL: {
      createObjectURL: () => `blob:fake/${++seq}`,
      revokeObjectURL: (u) => revoked.push(u),
    },
    window: {
      getSelection: () => ({ removeAllRanges() {}, addRange() {} }),
    },
  };
}

const IMG_METHODS = [
  "_insertInlineNode",
  "_beginInlineImage",
  "_releaseInlinePreview",
  "_settleInlineImage",
  "_wireInlineImageRecovery",
  "_dropOnDescEditor",
  "_isDroppableImage",
  "_splitFilename",
  "_isImageExt",
  "_serializeEditor",
];

// A panel whose upload is controllable, on a fake DOM.
function imgPanel({ upload } = {}) {
  const dom = fakeDom();
  const markers = require("../src/drumee/builtins/window/tasks/mention-markers.js");
  const Cls = new Function(
    "document",
    "URL",
    "window",
    "Butler",
    "LOCALE",
    "imgMarker",
    "linkMarker",
    "safeUrl",
    `return class { ${IMG_METHODS.map(method).join("\n")} }`,
  )(
    dom.document,
    dom.URL,
    dom.window,
    { said: [], say(m) { this.said.push(m); } },
    { ERROR_NETWORK: "ERROR_NETWORK" },
    markers.imgMarker,
    markers.linkMarker,
    markers.safeUrl,
  );
  const p = new Cls();
  p.fig = { family: "tasks-panel" };
  p.dom = dom;
  p.editor = dom.mk("div");
  p.editor.__root = 1; // everything under it counts as connected
  p.synced = 0;
  p._onDescInput = () => {
    p.synced += 1;
  };
  p.attached = [];
  p._attachFilesToZone = async (zone, files) => {
    p.attached.push({ zone, files });
  };
  p._makeInlineImage = (nid, hub) => {
    const wrap = dom.mk("span");
    wrap.className = "tasks-panel__inline-img";
    wrap.dataset.nid = String(nid);
    if (hub) wrap.dataset.hub = String(hub);
    wrap.appendChild(dom.mk("img"));
    return wrap;
  };
  p.uploads = 0;
  p._uploadInlineImage = async () => {
    p.uploads += 1;
    if (upload === "fail") throw new Error("http 500");
    if (typeof upload === "function") return upload(p.uploads);
    return { nid: "n1", hub: "h1" };
  };
  return p;
}

const PH = "tasks-panel__inline-img-pending";
const kidsOf = (n) => n.childNodes.map((c) => c.className || c.tagName);

test("a placeholder appears the moment the image is dropped, before any upload", () => {
  const p = imgPanel();
  const ph = p._beginInlineImage(file("a.png", "image/png"), "detail", p.editor, null);

  assert.equal(p.uploads, 0, "synchronous — nothing has been sent yet");
  assert.equal(ph.className, PH);
  assert.equal(ph.dataset.status, "uploading");
  assert.equal(ph.attrs.contenteditable, "false", "the caret must skip it");
  assert.equal(p.editor.childNodes[0], ph, "and it is in the editor");
  // The local file is shown while it uploads, as a queued attachment is.
  assert.match(ph.querySelector("img").src, /^blob:/);
  assert.deepEqual(kidsOf(ph), [
    "IMG",
    "tasks-panel__inline-img-spinner",
    "tasks-panel__inline-img-retry",
    "tasks-panel__inline-img-discard",
  ]);
});

test("the placeholder CANNOT reach the saved description", () => {
  // The whole safety argument, executed rather than asserted in a comment.
  const p = imgPanel();
  p.editor.appendChild(p.dom.text("before "));
  p._beginInlineImage(file("a.png", "image/png"), "detail", p.editor, null);
  p.editor.appendChild(p.dom.text(" after"));

  assert.equal(
    p._serializeEditor(p.editor),
    "before  after",
    "a placeholder serializes to nothing at all",
  );
});

test("...while a COMMITTED inline image still serializes to its marker", () => {
  // Positive control: the class test is a whole-token match, so
  // __inline-img-pending is not __inline-img — and this proves the real one
  // still is, i.e. that the exclusion was not achieved by breaking both.
  const p = imgPanel();
  const real = p._makeInlineImage("n9", "h9");
  p.editor.appendChild(real);
  assert.equal(p._serializeEditor(p.editor), "![img](file:n9@h9)");
});

test("a successful upload swaps the placeholder for the real image", async () => {
  const p = imgPanel();
  const ph = p._beginInlineImage(file("a.png", "image/png"), "detail", p.editor, null);
  await p._settleInlineImage(ph, file("a.png", "image/png"), "detail", p.editor);

  assert.equal(p.editor.childNodes.length, 1);
  assert.equal(p.editor.childNodes[0].className, "tasks-panel__inline-img");
  assert.equal(p.editor.childNodes[0].dataset.nid, "n1");
  assert.equal(ph.isConnected, false, "the placeholder is gone");
  assert.equal(p.dom.revoked.length, 1, "and its object URL was released");
  assert.ok(p.synced > 0, "the draft is resynced from the editor");
});

test("a failed upload keeps the placeholder, in its error state", async () => {
  const p = imgPanel({ upload: "fail" });
  const ph = p._beginInlineImage(file("a.png", "image/png"), "detail", p.editor, null);
  await p._settleInlineImage(ph, file("a.png", "image/png"), "detail", p.editor);

  assert.equal(ph.isConnected, true, "it must not vanish silently");
  assert.equal(ph.dataset.status, "error");
  assert.equal(p.dom.revoked.length, 0, "the preview stays — retry still needs it");
  // And it is still invisible to the serializer, which is what makes leaving
  // a failed placeholder on screen safe at all.
  assert.equal(p._serializeEditor(p.editor), "");
});

test("retry re-runs the upload and the image lands", async () => {
  let attempt = 0;
  const p = imgPanel({
    upload: () => {
      attempt += 1;
      if (attempt === 1) throw new Error("http 500");
      return { nid: "n2", hub: "h2" };
    },
  });
  const f = file("a.png", "image/png");
  const ph = p._beginInlineImage(f, "detail", p.editor, null);
  await p._settleInlineImage(ph, f, "detail", p.editor);
  assert.equal(ph.dataset.status, "error");

  ph.__click({ className: "tasks-panel__inline-img-retry", classList: { contains: (c) => c === "tasks-panel__inline-img-retry" } });
  await new Promise((r) => setImmediate(r));

  assert.equal(p.uploads, 2);
  assert.equal(p.editor.childNodes[0].dataset.nid, "n2");
});

test("retry wires exactly one listener however often it fails", async () => {
  const p = imgPanel({ upload: "fail" });
  const f = file("a.png", "image/png");
  const ph = p._beginInlineImage(f, "detail", p.editor, null);
  await p._settleInlineImage(ph, f, "detail", p.editor);
  await p._settleInlineImage(ph, f, "detail", p.editor);
  await p._settleInlineImage(ph, f, "detail", p.editor);
  assert.equal(
    ph.listeners.filter((l) => l.ev === "click").length,
    1,
    "a stacked listener would fire N uploads on one click",
  );
});

test("discard removes a failed placeholder and releases its preview", async () => {
  const p = imgPanel({ upload: "fail" });
  const f = file("a.png", "image/png");
  const ph = p._beginInlineImage(f, "detail", p.editor, null);
  await p._settleInlineImage(ph, f, "detail", p.editor);

  ph.__click({ className: "tasks-panel__inline-img-discard", classList: { contains: (c) => c === "tasks-panel__inline-img-discard" } });

  assert.equal(ph.isConnected, false);
  assert.equal(p.editor.childNodes.length, 0);
  assert.equal(p.dom.revoked.length, 1);
});

test("a placeholder wiped by a re-render still lets its image land", async () => {
  // _renderEditorContent rebuilds the body from the draft's markers, and a
  // placeholder is not a marker — so a render mid-upload takes it. The image
  // must still arrive: that is the behaviour this path had before there were
  // placeholders at all.
  const p = imgPanel();
  const f = file("a.png", "image/png");
  const ph = p._beginInlineImage(f, "detail", p.editor, null);
  ph.remove(); // the render
  await p._settleInlineImage(ph, f, "detail", p.editor);

  assert.equal(p.editor.childNodes.length, 1);
  assert.equal(p.editor.childNodes[0].dataset.nid, "n1");
});

test("a drop of several images shows ALL their spinners at once", async () => {
  // The point of the loading state: settling inside the placing loop would
  // mean the second spinner only appeared once the first upload had finished.
  const p = imgPanel();
  const gate = [];
  p._uploadInlineImage = () =>
    new Promise((resolve) => gate.push(() => resolve({ nid: "n1", hub: "h1" })));

  const zone = { scope: "desc", descScope: "detail", el: p.editor, range: null };
  const run = p._dropOnDescEditor(zone, [
    file("a.png", "image/png"),
    file("b.png", "image/png"),
    file("c.png", "image/png"),
  ]);
  await new Promise((r) => setImmediate(r));

  assert.equal(
    p.editor.childNodes.filter((n) => n.className === PH).length,
    3,
    "three placeholders, before a single upload has resolved",
  );
  assert.equal(gate.length, 1, "and the uploads themselves are still one at a time");

  // Pump: each upload only queues its gate entry once the previous one has
  // resolved, so a single drain would leave the drop hanging.
  let done = false;
  run.then(() => { done = true; });
  for (let i = 0; i < 20 && !done; i++) {
    while (gate.length) gate.shift()();
    await new Promise((r) => setImmediate(r));
  }
  await run;
});

test("a mixed drop still attaches the non-images and inlines the rest", async () => {
  const p = imgPanel();
  const zone = { scope: "desc", descScope: "detail", el: p.editor, range: null };
  await p._dropOnDescEditor(zone, [
    file("a.png", "image/png"),
    file("b.pdf", "application/pdf"),
  ]);

  assert.deepEqual(p.attached[0].zone, { scope: "detail", key: "detail" });
  assert.deepEqual(p.attached[0].files.map((f) => f.name), ["b.pdf"]);
  assert.equal(p.editor.childNodes[0].dataset.nid, "n1");
});

test("a paste still goes through the same begin+settle path", async () => {
  // _insertPastedImage keeps its signature, which is what gives paste the
  // loading state for free — the two must not diverge.
  const src = readFileSync(PANEL, "utf8");
  const body = /\n  async _insertPastedImage\([^)]*\)\s*\{([\s\S]*?)\n  \}\n/.exec(src);
  assert.ok(body, "_insertPastedImage not found");
  assert.match(body[1], /_beginInlineImage/);
  assert.match(body[1], /_settleInlineImage/);
});
