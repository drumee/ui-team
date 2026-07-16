// Single source of truth for the @-mention marker grammar, shared by the task
// description editor and the comment composer. Stored/serialized form is
// "[@Full Name](user:uid)"; on read-only surfaces it renders as plain "@Name".
const MARKER_SOURCE = "\\[@([^\\]]+)\\]\\(user:([^)]+)\\)";

// Inline pasted image, stored as "![img](file:NID@HUB|WIDTH)". HUB and WIDTH
// are optional; NID/HUB exclude ) | @ , WIDTH is digits (pixels).
const IMG_MARKER_SOURCE =
  "!\\[img\\]\\(file:([^)|@]+)(?:@([^)|]+))?(?:\\|(\\d+))?\\)";

// Fresh /g regex per call — never share one (lastIndex is stateful).
function markerRe() {
  return new RegExp(MARKER_SOURCE, "g");
}

function imgMarkerRe() {
  return new RegExp(IMG_MARKER_SOURCE, "g");
}

// Combined mention|image token stream for the editor render/serialize passes.
// Groups: 1=name 2=uid (mention); 3=nid 4=hub 5=width (image).
function contentTokenRe() {
  return new RegExp(MARKER_SOURCE + "|" + IMG_MARKER_SOURCE, "g");
}

// Build the stored form of an inline image.
function imgMarker(nid, hub, width) {
  let s = `![img](file:${nid}`;
  if (hub) s += `@${hub}`;
  if (width) s += `|${Math.round(width)}`;
  return s + ")";
}

// Strip markers for cards/previews: mentions → plain "@Name" (no raw uid
// payload leaks), inline images → a neutral glyph placeholder.
function stripMarkers(text) {
  if (!text) return "";
  return String(text)
    .replace(markerRe(), "@$1")
    .replace(imgMarkerRe(), "🖼");
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
  markerRe,
  imgMarkerRe,
  contentTokenRe,
  imgMarker,
  stripMarkers,
  uidsFromText,
};
