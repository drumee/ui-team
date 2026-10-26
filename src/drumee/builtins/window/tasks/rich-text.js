// Stored grammar of task descriptions and comments, and the two pure
// directions over it: text → blocks (parse) and blocks → text (stringify).
//
// A superset of the marker text mention-markers.js already defines, so every
// body stored before formatting existed still parses to itself:
//
//   **bold**  _italic_  ++underline++  ~~strike~~   inline marks, nestable,
//                                                  may wrap the atoms below
//   [@Name](user:uid)  ![img](file:…)  [label](link:url)   atoms (unchanged)
//   "- item" / "N. item" lines                     bulleted / numbered lists
//   \\ \* \_ \+ \~                                 a literal character
//
// A delimiter only opens when its closer follows on the same line, and "_"
// only opens / closes at a word edge, so legacy "C++", "2*3" and
// "foo_bar_baz" stay text. stringify escapes every \ * _ + ~ it writes as
// text, so what it writes always parses back to the same blocks.
//
// No DOM and no globals: everything here runs under plain node in a test.
const { contentTokenRe, imgMarker, linkMarker } = require("./mention-markers");

// Delimiter → mark, and back.
const MARK_OF = { "**": "b", _: "i", "++": "u", "~~": "s" };
const DELIM_OF = { b: "**", i: "_", u: "++", s: "~~" };
const ESCAPABLE = "\\*_+~";
const ATOM_RE = new RegExp(contentTokenRe().source, "y");

const isWordChar = (c) => !!c && /[\p{L}\p{N}]/u.test(c);

/**
 * @typedef {{t:"text", v:string}
 *   | {t:"mark", m:"b"|"i"|"u"|"s", kids:Inline[]}
 *   | {t:"mention", name:string, uid:string}
 *   | {t:"img", nid:string, hub:?string, width:?number}
 *   | {t:"link", label:string, url:string}} Inline
 * @typedef {{t:"line", kids:Inline[]} | {t:"ul"|"ol", items:Inline[][]}} Block
 */

// Append, folding adjacent text into one node.
function pushNode(kids, node) {
  const last = kids[kids.length - 1];
  if (node.t === "text") {
    if (!node.v) return;
    if (last && last.t === "text") {
      last.v += node.v;
      return;
    }
  }
  kids.push(node);
}

function atomOf(m) {
  if (m[2] != null) return { t: "mention", name: m[1], uid: m[2] };
  if (m[3] != null) {
    return { t: "img", nid: m[3], hub: m[4] || null, width: m[5] ? Number(m[5]) : null };
  }
  return { t: "link", label: m[6], url: m[7] };
}

// One line → tokens: atoms, text runs, and delimiters with their open / close
// eligibility (only "_" has a word-edge rule).
function tokenize(src) {
  const toks = [];
  let text = "";
  const flush = () => {
    if (text) toks.push({ k: "text", v: text });
    text = "";
  };
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === "[" || c === "!") {
      ATOM_RE.lastIndex = i;
      const m = ATOM_RE.exec(src);
      if (m) {
        flush();
        toks.push({ k: "atom", node: atomOf(m) });
        i += m[0].length;
        continue;
      }
    }
    if (c === "\\" && ESCAPABLE.includes(src[i + 1] || "\0")) {
      text += src[i + 1];
      i += 2;
      continue;
    }
    const two = src.slice(i, i + 2);
    const d = two === "**" || two === "++" || two === "~~" ? two : c === "_" ? "_" : null;
    if (d) {
      flush();
      const prev = src[i - 1];
      const next = src[i + d.length];
      const edge = d !== "_";
      toks.push({
        k: "delim",
        d,
        open: edge || !isWordChar(prev),
        close: edge || !isWordChar(next),
      });
      i += d.length;
      continue;
    }
    text += c;
    i++;
  }
  flush();
  return toks;
}

// Tokens → Inline[]. A stack of open frames; a frame whose delimiter never
// closes falls back to its delimiter as text.
function parseInline(src) {
  const toks = tokenize(src);
  const root = { kids: [] };
  const stack = [root];
  const unwind = (frame, into) => {
    pushNode(into.kids, { t: "text", v: frame.d });
    frame.kids.forEach((n) => pushNode(into.kids, n));
  };
  toks.forEach((tok, j) => {
    const top = stack[stack.length - 1];
    if (tok.k === "text") return pushNode(top.kids, { t: "text", v: tok.v });
    if (tok.k === "atom") return pushNode(top.kids, tok.node);
    let at = -1;
    if (tok.close) for (let k = stack.length - 1; k > 0 && at < 0; k--) if (stack[k].d === tok.d) at = k;
    if (at > 0) {
      while (stack.length - 1 > at) {
        const f = stack.pop();
        unwind(f, stack[stack.length - 1]);
      }
      const f = stack.pop();
      const parent = stack[stack.length - 1];
      if (!f.kids.length) {
        pushNode(parent.kids, { t: "text", v: f.d + f.d });
      } else {
        pushNode(parent.kids, { t: "mark", m: MARK_OF[f.d], kids: f.kids });
      }
      return;
    }
    const closes = toks.slice(j + 1).some((x) => x.k === "delim" && x.d === tok.d && x.close);
    if (tok.open && closes) return stack.push({ d: tok.d, kids: [] });
    pushNode(top.kids, { t: "text", v: tok.d });
  });
  while (stack.length > 1) {
    const f = stack.pop();
    unwind(f, stack[stack.length - 1]);
  }
  return root.kids;
}

/** @returns {Block[]} */
function parse(text) {
  const src = String(text == null ? "" : text);
  if (!src) return [];
  const blocks = [];
  src.split("\n").forEach((line) => {
    let m;
    let type = null;
    let lead = "";
    let rest = line;
    if ((m = /^- /.exec(line))) {
      type = "ul";
      rest = line.slice(m[0].length);
    } else if ((m = /^\d+\. /.exec(line))) {
      type = "ol";
      rest = line.slice(m[0].length);
    } else if ((m = /^\\- /.exec(line))) {
      lead = "- ";
      rest = line.slice(m[0].length);
    } else if ((m = /^(\d+)\\\. /.exec(line))) {
      lead = `${m[1]}. `;
      rest = line.slice(m[0].length);
    }
    const kids = [];
    pushNode(kids, { t: "text", v: lead });
    parseInline(rest).forEach((n) => pushNode(kids, n));
    const last = blocks[blocks.length - 1];
    if (!type) blocks.push({ t: "line", kids });
    else if (last && last.t === type) last.items.push(kids);
    else blocks.push({ t: type, items: [kids] });
  });
  return blocks;
}

const escapeText = (s) => s.replace(/[\\*_+~]/g, (c) => `\\${c}`);

function stringifyNode(n, prev, nextOf) {
  switch (n.t) {
    case "text":
      return escapeText(n.v);
    case "mark": {
      const body = stringifyInline(n.kids);
      // "_" cannot open after, or close before, a letter: that is what keeps
      // legacy snake_case plain. Italic inside a word therefore has no stored
      // form — keep the words rather than write underscores that would read
      // back as literal text.
      if (n.m === "i" && (isWordChar(prev) || isWordChar(nextOf()))) return body;
      return DELIM_OF[n.m] + body + DELIM_OF[n.m];
    }
    case "mention":
      return `[@${n.name}](user:${n.uid})`;
    case "img":
      return imgMarker(n.nid, n.hub, n.width || undefined);
    case "link":
      return linkMarker(n.label, n.url);
    default:
      return "";
  }
}

function stringifyInline(kids) {
  let out = "";
  kids.forEach((n, k) => {
    const nextOf = () => (kids[k + 1] ? stringifyNode(kids[k + 1], "", () => "")[0] : "");
    out += stringifyNode(n, out[out.length - 1], nextOf);
  });
  return out;
}

/** @param {Block[]} blocks */
function stringify(blocks) {
  const lines = [];
  (blocks || []).forEach((b) => {
    if (b.t === "ul") b.items.forEach((it) => lines.push(`- ${stringifyInline(it)}`));
    else if (b.t === "ol") b.items.forEach((it, n) => lines.push(`${n + 1}. ${stringifyInline(it)}`));
    else {
      // A plain line that would read back as a list item is escaped.
      lines.push(
        stringifyInline(b.kids)
          .replace(/^- /, "\\- ")
          .replace(/^(\d+)\. /, "$1\\. "),
      );
    }
  });
  return lines.join("\n");
}

function plainInline(kids) {
  return kids
    .map((n) => {
      switch (n.t) {
        case "text":
          return n.v;
        case "mark":
          return plainInline(n.kids);
        case "mention":
          return `@${n.name}`;
        case "img":
          return "🖼";
        case "link":
          return n.label;
        default:
          return "";
      }
    })
    .join("");
}

/** Cards and previews: the words, with no markup. */
function toPlain(text) {
  const lines = [];
  parse(text).forEach((b) => {
    if (b.t === "line") lines.push(plainInline(b.kids));
    else b.items.forEach((it) => lines.push(plainInline(it)));
  });
  return lines.join("\n");
}

// ── DOM → blocks ────────────────────────────────────────────────────────────
const MARK_ORDER = ["b", "i", "u", "s"];

// The marks an element turns on or off for its subtree. Its own inline style
// wins over its tag: Google Docs wraps a whole paste in
// <b style="font-weight:normal">.
function marksOf(n, inherited) {
  const m = { ...inherited };
  const tag = n.tagName;
  if (tag === "B" || tag === "STRONG") m.b = true;
  if (tag === "I" || tag === "EM") m.i = true;
  if (tag === "U") m.u = true;
  if (tag === "S" || tag === "STRIKE" || tag === "DEL") m.s = true;
  const st = n.style || {};
  const w = st.fontWeight;
  if (w) m.b = w === "bold" || w === "bolder" || parseInt(w, 10) >= 600;
  if (st.fontStyle) m.i = /italic|oblique/.test(st.fontStyle);
  // A decoration is drawn through the whole subtree, so a span can add one
  // but not take its parent's away.
  const deco = `${st.textDecorationLine || ""} ${st.textDecoration || ""}`;
  if (/underline/.test(deco)) m.u = true;
  if (/line-through/.test(deco)) m.s = true;
  return m;
}

// Runs (a node + the marks over it) → nested Inline[], marks nested in one
// fixed order (b > i > u > s) so the same DOM always gives the same text.
function buildInline(runs, k = 0) {
  if (k === MARK_ORDER.length) {
    const kids = [];
    runs.forEach((r) => pushNode(kids, r.node.t === "text" ? { t: "text", v: r.node.v } : r.node));
    return kids;
  }
  const mark = MARK_ORDER[k];
  const out = [];
  let i = 0;
  while (i < runs.length) {
    const on = !!runs[i].marks[mark];
    let j = i;
    while (j < runs.length && !!runs[j].marks[mark] === on) j++;
    const inner = buildInline(runs.slice(i, j), k + 1);
    // Bolded whitespace alone is just whitespace.
    const blank = inner.every((n) => n.t === "text" && !n.v.trim());
    if (!on || blank) inner.forEach((n) => pushNode(out, n));
    else out.push({ t: "mark", m: mark, kids: inner });
    i = j;
  }
  return out;
}

/**
 * Editor DOM → blocks. <br> and <div>/<p>/<li> boundaries make lines,
 * <ul>/<ol> make list items (nested lists flatten into the outer one),
 * mention chips / inline images / safe links are atoms.
 * @returns {Block[]}
 */
function fromDom(root, { chipClass, imgClass, safeUrl }) {
  const lines = [];
  let cur = null;
  const line = (type) => {
    cur = { type, runs: [] };
    lines.push(cur);
    return cur;
  };
  const add = (type, node, marks) => {
    (cur || line(type)).runs.push({ node, marks });
  };
  // A <br> ends the line in progress; with none in progress it IS a line.
  const brk = (type) => {
    if (cur) cur = null;
    else {
      line(type);
      cur = null;
    }
  };
  const block = (n, type, marks) => {
    cur = null;
    const before = lines.length;
    walk(n, type, marks);
    if (lines.length === before) line(type);
    cur = null;
  };
  const walk = (node, type, marks) => {
    node.childNodes.forEach((n) => {
      if (n.nodeType === 3) {
        n.textContent.split("\n").forEach((part, i) => {
          if (i > 0) brk(type);
          if (part) add(type, { t: "text", v: part }, marks);
        });
        return;
      }
      if (n.nodeType !== 1) return;
      const cls = n.classList;
      if (cls && cls.contains(chipClass)) {
        const name = n.dataset.name || n.textContent.replace(/^@/, "");
        return add(type, { t: "mention", name, uid: n.dataset.uid }, marks);
      }
      if (cls && cls.contains(imgClass)) {
        const w = parseInt(n.style && n.style.width, 10) || null;
        return add(type, { t: "img", nid: n.dataset.nid, hub: n.dataset.hub || null, width: w }, marks);
      }
      const tag = n.tagName;
      const m = marksOf(n, marks);
      if (tag === "A") {
        const href = safeUrl(n.dataset.href || n.getAttribute("href"));
        const label = (n.textContent || "").trim();
        if (!href || !label) return walk(n, type, m);
        if (label === href) return add(type, { t: "text", v: label }, m);
        return add(type, { t: "link", label, url: href }, m);
      }
      if (tag === "BR") return brk(type);
      if (tag === "UL" || tag === "OL") {
        cur = null;
        walk(n, type === "line" ? tag.toLowerCase() : type, m);
        cur = null;
        return;
      }
      if (tag === "DIV" || tag === "P" || tag === "LI") return block(n, type, m);
      walk(n, type, m);
    });
  };
  walk(root, "line", {});

  const blocks = [];
  lines.forEach(({ type, runs }) => {
    const kids = buildInline(runs);
    const last = blocks[blocks.length - 1];
    if (type === "line") blocks.push({ t: "line", kids });
    else if (last && last.t === type) last.items.push(kids);
    else blocks.push({ t: type, items: [kids] });
  });
  // One empty line is an empty editor.
  if (blocks.length === 1 && blocks[0].t === "line" && !blocks[0].kids.length) return [];
  return blocks;
}

// ── blocks → DOM ────────────────────────────────────────────────────────────
const TAG_OF = { b: "b", i: "i", u: "u", s: "s" };

/**
 * Blocks → a fragment of <b>/<i>/<u>/<s>/<ul>/<ol>/<li>, text, and the atoms
 * `make` builds. Never innerHTML: bodies are written by other users. Lines are
 * split by <br>, none next to a list; an empty line that no following <br>
 * would mark carries its own, so fromDom reads back every line.
 */
function toDom(blocks, doc, make) {
  const frag = doc.createDocumentFragment();
  const inline = (kids, into) => {
    kids.forEach((n) => {
      if (n.t === "text") make.text(n.v).forEach((x) => into.appendChild(x));
      else if (n.t === "mark") {
        const e = doc.createElement(TAG_OF[n.m]);
        inline(n.kids, e);
        into.appendChild(e);
      } else if (n.t === "mention") into.appendChild(make.mention(n.name, n.uid));
      else if (n.t === "img") into.appendChild(make.img(n.nid, n.hub, n.width));
      else if (n.t === "link") into.appendChild(make.link(n.label, n.url));
    });
  };
  blocks.forEach((b, k) => {
    const next = blocks[k + 1];
    if (b.t === "line") {
      inline(b.kids, frag);
      if (next && next.t === "line") frag.appendChild(doc.createElement("br"));
      else if (!b.kids.length) frag.appendChild(doc.createElement("br"));
      return;
    }
    const list = doc.createElement(b.t);
    b.items.forEach((kids) => {
      const li = doc.createElement("li");
      inline(kids, li);
      // An empty item still needs a caret line to type into.
      if (!kids.length) li.appendChild(doc.createElement("br"));
      list.appendChild(li);
    });
    frag.appendChild(list);
  });
  return frag;
}

/** True when the text holds anything a plain text box would show as markup. */
function hasRichContent(text) {
  const rich = (kids) => kids.some((n) => n.t !== "text");
  return parse(text).some((b) => (b.t === "line" ? rich(b.kids) : true));
}

module.exports = { parse, stringify, fromDom, toDom, toPlain, hasRichContent };
