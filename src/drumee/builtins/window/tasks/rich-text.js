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

function stringifyInline(kids) {
  return kids
    .map((n) => {
      switch (n.t) {
        case "text":
          return escapeText(n.v);
        case "mark":
          return DELIM_OF[n.m] + stringifyInline(n.kids) + DELIM_OF[n.m];
        case "mention":
          return `[@${n.name}](user:${n.uid})`;
        case "img":
          return imgMarker(n.nid, n.hub, n.width || undefined);
        case "link":
          return linkMarker(n.label, n.url);
        default:
          return "";
      }
    })
    .join("");
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

/** True when the text holds anything a plain text box would show as markup. */
function hasRichContent(text) {
  const rich = (kids) => kids.some((n) => n.t !== "text");
  return parse(text).some((b) => (b.t === "line" ? rich(b.kids) : true));
}

module.exports = { parse, stringify, toPlain, hasRichContent };
