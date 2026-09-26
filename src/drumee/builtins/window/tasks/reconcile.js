// Keyed repaint for skeleton trees.
//
// ui-core's feed() is `collection.set(freshObjects)`: skeleton nodes carry no
// id, so Backbone treats every one as new and Marionette destroys and rebuilds
// the whole subtree. On the task board that is every card, every avatar (which
// then reloads its picture asynchronously — blank for a frame, then the photo)
// and every scroller, for a change to ONE task. That rebuild is the flicker on
// create / update / delete / filter.
//
// This module makes a repaint touch only what changed:
//
//   stamp(node)            hashes every skeleton node bottom-up: `_shell` is
//                          the node's own props (kids excluded), `_sig` the
//                          node plus its whole subtree. They ride into the
//                          Backbone model as plain attributes.
//   reconcile(view, kids)  walks the MOUNTED tree against a freshly built one.
//                          A child whose `_sig` matches is kept as is; a plain
//                          box whose `_shell` matches is kept and recursed
//                          into; anything else is built new. Only the
//                          collections that actually differ get a set().
//
// Rules that keep it honest:
//   - Only `kind: "box"` nodes are recursed into, and only when they carry no
//     kidsOpt / kidsMap / populate (ui-core rewrites those kids at init, so the
//     mounted models would not compare). Every other widget is all-or-nothing.
//   - Boxes are ALWAYS recursed, even on an exact `_sig` hit: the panel feeds
//     some parts by hand (subtask rows, column menus, …), so a box's model can
//     say "unchanged" while its children were swapped underneath. Recursing is
//     a walk over plain models — no DOM — and a no-op when nothing moved.
//   - A mounted child is reused only while its element still sits in its
//     parent's container. The drag path moves card elements between columns
//     by hand and detaches the empty-column hint; those views are rebuilt
//     rather than trusted.
//   - Functions and DOM nodes in a skeleton hash to a fresh token each build,
//     so a node holding one is never reused. Views and models hash to their
//     cid (uiHandler: [ui] is the same panel every build).
//
// No DOM and no `this`: everything here runs under plain node in a test.

// cyrb53 — small, fast, 53-bit string hash. Collisions only cost a missed
// rebuild if two DIFFERENT nodes at the same level collide, ~2^-53.
function hash(str) {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

const OWN_SKIP = { kids: 1, _sig: 1, _shell: 1 };

// Module-wide, NOT per build: a token must never repeat across two builds, or
// a node holding a function would match its own previous self.
let uniq = 0;

function kidsOf(node) {
  const k = node && node.kids;
  if (Array.isArray(k)) return k;
  return k && typeof k === "object" ? [k] : [];
}

function isNode(v) {
  return !!(v && typeof v === "object" && v.kind);
}

/**
 * Stamp `_shell` / `_sig` on a skeleton tree, in place. Returns the root sig.
 * @param {Object} node
 */
function stamp(node) {
  if (!isNode(node)) return String(node);
  const kidSigs = kidsOf(node).map(stamp);
  const own = {};
  for (const key in node) {
    if (!OWN_SKIP[key]) own[key] = node[key];
  }
  let shell;
  try {
    shell = JSON.stringify(own, (key, v) => {
      if (typeof v === "function") return `\u0000fn${++uniq}`;
      if (v && typeof v === "object") {
        // Backbone view / model — the panel itself in uiHandler/partHandler.
        if (v.cid && (v.el || v.attributes)) return `\u0000@${v.cid}`;
        if (typeof Node !== "undefined" && v instanceof Node) {
          return `\u0000node${++uniq}`;
        }
      }
      return v;
    });
  } catch (_) {
    // Circular or otherwise unserialisable: never equal to anything.
    shell = `\u0000x${++uniq}`;
  }
  node._shell = hash(shell);
  node._sig = hash(`${node._shell}[${kidSigs.join(",")}]`);
  return node._sig;
}

function canRecurse(node) {
  return !!(
    node &&
    node.kind === "box" &&
    !node.kidsOpt &&
    !node.itemsOpt &&
    !node.kidsMap &&
    !node.itemsMap &&
    !node.populate
  );
}

function isCollectionView(v) {
  return !!(
    v &&
    v.collection &&
    typeof v.collection.set === "function" &&
    v.children &&
    typeof v.children.findByModel === "function"
  );
}

function containerOf(view) {
  return (view.$container && view.$container[0]) || view.el;
}

function alive(v) {
  return !!(v && !(typeof v.isDestroyed === "function" && v.isDestroyed()));
}

/**
 * Bring a mounted collection view's children in line with `desired`, reusing
 * every child view that still matches.
 *
 * @param {Object} parent  a mounted LetcBox (Marionette CollectionView)
 * @param {Array}  desired stamped skeleton nodes
 * @param {Object} [stats] { kept, built, removed } counters, filled in
 * @returns {Boolean} false when `parent` cannot be reconciled (caller feeds)
 */
function reconcile(parent, desired, stats = { kept: 0, built: 0, removed: 0 }) {
  if (!isCollectionView(parent) || !alive(parent)) return false;
  const coll = parent.collection;
  const want = (desired || []).filter(isNode);
  const container = containerOf(parent);
  const current = coll.models.slice();

  const viewOf = (m) => parent.children.findByModel(m);
  const bySig = new Map();
  const byShell = new Map();
  const push = (map, key, m) => {
    if (!key) return;
    const list = map.get(key);
    if (list) list.push(m);
    else map.set(key, [m]);
  };
  for (const m of current) {
    const v = viewOf(m);
    if (!alive(v) || !v.el || v.el.parentNode !== container) continue;
    push(bySig, m.get("_sig"), m);
    push(byShell, m.get("_shell"), m);
  }
  const used = new Set();
  const take = (map, key, ok) => {
    const list = key && map.get(key);
    if (!list) return null;
    for (let i = 0; i < list.length; i++) {
      const m = list[i];
      if (used.has(m) || (ok && !ok(m))) continue;
      list.splice(i, 1);
      used.add(m);
      return m;
    }
    return null;
  };

  // Pass 1 — exact subtree matches, so a later identical node is never robbed
  // of its match by an earlier node that only shares a shell.
  const next = want.map((node) => take(bySig, node._sig));
  // Pass 2 — same shell: keep the box, patch inside it.
  for (let i = 0; i < want.length; i++) {
    const node = want[i];
    if (next[i] || !canRecurse(node)) continue;
    next[i] = take(byShell, node._shell, (m) => canRecurse(m.attributes));
  }
  // Recurse into every kept box — including exact hits (see the header).
  for (let i = 0; i < want.length; i++) {
    const m = next[i];
    const node = want[i];
    if (!m) continue;
    if (canRecurse(node)) {
      const v = viewOf(m);
      if (!isCollectionView(v) || !reconcile(v, kidsOf(node), stats)) {
        // Could not patch it after all — build it fresh instead.
        used.delete(m);
        next[i] = null;
        continue;
      }
      m.set({ _sig: node._sig, _shell: node._shell, kids: node.kids }, { silent: true });
    }
    stats.kept++;
  }

  const toRemove = current.filter((m) => !used.has(m));
  const list = want.map((node, i) => next[i] || node);
  const fresh = want.filter((node, i) => !next[i]);
  stats.built += fresh.length;
  stats.removed += toRemove.length;

  const sameOrder =
    !toRemove.length &&
    !fresh.length &&
    list.length === current.length &&
    list.every((m, i) => m === current[i]);
  if (sameOrder) return true;

  // Offsets of the container and every scrolled ancestor, put back at the end
  // in case anything below still empties the container for an instant.
  const scrolled = scrollChain(container);

  // A new node whose `id` equals a leaving model's id would be MERGED into it
  // by Backbone (and its stale view kept); drop the leavers first then.
  const collides = fresh.some((n) => n.id != null && toRemove.some((m) => m.id == n.id));

  if (canPlaceByHand(parent)) {
    // Marionette's default re-sort re-appends EVERY child through a fragment
    // after any change. That moves each kept element out of the document and
    // back, which resets the scroll of every scroller inside it and empties
    // the container for an instant (measured in Chrome: a column at 600 came
    // back at 0 after one card was removed), and it is O(children) DOM moves
    // for a one-card change. With the comparator off for the set(), Marionette
    // takes its add-to-end path instead: removed views go, new ones are
    // appended, nothing else is touched. Then the internal order is sorted to
    // the collection and only the elements that are out of place are moved.
    //
    // A REMOVAL-only update still re-appends everything: Marionette falls back
    // to `children._views` whenever nothing was added (`_addedViews` is 0). The
    // removed views are detached on their own before that, so for that one case
    // the re-append is skipped — unless the view is now empty, where the render
    // pass is what shows the empty view.
    const owned = Object.prototype.hasOwnProperty.call(parent, "viewComparator");
    const previous = parent.viewComparator;
    const ownRender = Object.prototype.hasOwnProperty.call(parent, "_renderChildren");
    const render = parent._renderChildren;
    parent.viewComparator = false;
    parent._renderChildren = function () {
      if (this._addedViews || this.isEmpty()) return render.apply(this, arguments);
      delete this._addedViews;
    };
    try {
      if (collides && toRemove.length) coll.remove(toRemove);
      coll.set(list);
    } finally {
      if (owned) parent.viewComparator = previous;
      else delete parent.viewComparator;
      if (ownRender) parent._renderChildren = render;
      else delete parent._renderChildren;
    }
    parent._children._sort(parent._viewComparator, parent);
    parent.children._set(parent._children._views);
    placeInOrder(container, parent._children._views.map((v) => v.el));
  } else {
    if (collides && toRemove.length) coll.remove(toRemove);
    coll.set(list);
    // A pure reorder fires `sort` with add/remove set, which Marionette
    // ignores ("handled in update"), and no `update` — so the views would stay
    // in the old order. Sort them explicitly.
    if (!fresh.length && !toRemove.length && typeof parent.sort === "function") {
      parent.sort();
    }
  }
  for (const [el, top, left] of scrolled) {
    if (el.scrollTop !== top) el.scrollTop = top;
    if (el.scrollLeft !== left) el.scrollLeft = left;
  }
  return true;
}

// Marionette 4 internals the hand placement relies on, and no custom order or
// filter that it would bypass.
function canPlaceByHand(v) {
  return !!(
    v.sortWithCollection &&
    !v.viewComparator &&
    !v.viewFilter &&
    typeof v._viewComparator === "function" &&
    v._children &&
    typeof v._children._sort === "function" &&
    v.children &&
    typeof v.children._set === "function" &&
    typeof v._renderChildren === "function" &&
    typeof v.isEmpty === "function"
  );
}

// Move each element to follow the previous one, touching only those out of
// place — an insert moves one node, a delete moves none.
function placeInOrder(container, els) {
  let cursor = null;
  for (const el of els) {
    if (!el) continue;
    const want = cursor ? cursor.nextSibling : container.firstChild;
    if (el !== want) container.insertBefore(el, want);
    cursor = el;
  }
}

// `el` and every ancestor currently scrolled, with their offsets.
function scrollChain(el) {
  const out = [];
  for (let n = el; n && n.nodeType === 1; n = n.parentNode) {
    if (n.scrollTop || n.scrollLeft) out.push([n, n.scrollTop, n.scrollLeft]);
  }
  return out;
}

module.exports = { stamp, reconcile, hash };
