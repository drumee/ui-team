// Single source of truth for the @-mention marker grammar, shared by the task
// description editor and the comment composer. Stored/serialized form is
// "[@Full Name](user:uid)"; on read-only surfaces it renders as plain "@Name".
const MARKER_SOURCE = "\\[@([^\\]]+)\\]\\(user:([^)]+)\\)";

// Inline pasted image, stored as "![img](file:NID@HUB|WIDTH)". HUB and WIDTH
// are optional; NID/HUB exclude ) | @ , WIDTH is digits (pixels).
const IMG_MARKER_SOURCE =
  "!\\[img\\]\\(file:([^)|@]+)(?:@([^)|]+))?(?:\\|(\\d+))?\\)";

// Hyperlink whose text differs from its target, stored as "[label](link:URL)".
// A bare URL needs no marker — read-only surfaces auto-link it (linkifyTokens),
// which is also what makes links already stored as plain text clickable.
const LINK_MARKER_SOURCE = "\\[([^\\]]+)\\]\\(link:([^)\\s]+)\\)";

// Fresh /g regex per call — never share one (lastIndex is stateful).
function markerRe() {
  return new RegExp(MARKER_SOURCE, "g");
}

function imgMarkerRe() {
  return new RegExp(IMG_MARKER_SOURCE, "g");
}

function linkMarkerRe() {
  return new RegExp(LINK_MARKER_SOURCE, "g");
}

// Combined mention|image|link token stream for the editor render/serialize
// passes. Groups: 1=name 2=uid (mention); 3=nid 4=hub 5=width (image);
// 6=label 7=url (link). "](user:" / "](file:" / "](link:" keep them disjoint.
function contentTokenRe() {
  return new RegExp(
    MARKER_SOURCE + "|" + IMG_MARKER_SOURCE + "|" + LINK_MARKER_SOURCE,
    "g",
  );
}

// Only these schemes ever reach an href. Bodies are written by other users, so
// an unfiltered "[click me](link:javascript:…)" would be script injection on
// every reader's screen.
const SAFE_SCHEME = /^(?:https?:|mailto:)/i;

// Bare URLs in body text. Greedy to the next whitespace; trailing sentence
// punctuation is peeled off by trimUrlTail.
function urlRe() {
  return /(?:https?:\/\/|www\.)[^\s<>"']+/gi;
}

// "see https://x.dev/a." must not swallow the full stop. A closing paren only
// counts as punctuation when the URL has no opening one, so "…/Foo_(bar)" survives.
function trimUrlTail(u) {
  let end = u.length;
  for (;;) {
    const c = u[end - 1];
    if (end && ".,;:!?'\"".includes(c)) end--;
    else if (end && c === ")" && !u.slice(0, end).includes("(")) end--;
    else break;
  }
  return u.slice(0, end);
}

// Normalise to something safe to put in an href, or null to leave it as text.
function safeUrl(raw) {
  let u = String(raw || "").trim();
  if (!u) return null;
  if (/^www\./i.test(u)) u = `https://${u}`;
  return SAFE_SCHEME.test(u) ? u : null;
}

// Split plain text into [{text}] / [{url, label}] runs for read-only rendering.
function linkifyTokens(text) {
  const src = String(text || "");
  const out = [];
  const re = urlRe();
  let last = 0;
  let m;
  while ((m = re.exec(src))) {
    const label = trimUrlTail(m[0]);
    const url = label && safeUrl(label);
    if (!url) continue;
    if (m.index > last) out.push({ text: src.slice(last, m.index) });
    out.push({ url, label });
    last = m.index + label.length;
    re.lastIndex = last; // the peeled punctuation is text, not part of the URL
  }
  if (last < src.length) out.push({ text: src.slice(last) });
  return out;
}

// Build the stored form of a hyperlink. Characters that would break the grammar
// out of its own marker never survive into one: "]" and newlines in the label,
// and — since the url group stops at the first ")" — a literal ")" or space in
// the target, percent-encoded here and equivalent once in an href.
function linkMarker(label, url) {
  const text = String(label || "")
    .replace(/[\][\n\r]+/g, " ")
    .trim();
  const href = String(url || "")
    .replace(/\)/g, "%29")
    .replace(/\s/g, "%20");
  return `[${text}](link:${href})`;
}

// Build the stored form of an inline image.
function imgMarker(nid, hub, width) {
  let s = `![img](file:${nid}`;
  if (hub) s += `@${hub}`;
  if (width) s += `|${Math.round(width)}`;
  return s + ")";
}

// Strip markers for cards/previews: mentions → plain "@Name" (no raw uid
// payload leaks), inline images → a neutral glyph placeholder, links → their
// label (the URL is noise in a one-line preview).
function stripMarkers(text) {
  if (!text) return "";
  return String(text)
    .replace(markerRe(), "@$1")
    .replace(imgMarkerRe(), "🖼")
    .replace(linkMarkerRe(), "$1");
}

// Unique mentioned uids from marker text.
function uidsFromText(text) {
  const uids = [];
  String(text || "").replace(markerRe(), (m, name, uid) => {
    if (uid && !uids.includes(String(uid))) uids.push(String(uid));
    return m;
  });
  return uids;
}

module.exports = {
  MARKER_SOURCE,
  IMG_MARKER_SOURCE,
  LINK_MARKER_SOURCE,
  markerRe,
  imgMarkerRe,
  linkMarkerRe,
  contentTokenRe,
  imgMarker,
  linkMarker,
  linkifyTokens,
  safeUrl,
  stripMarkers,
  uidsFromText,
};
