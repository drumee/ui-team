// Marker grammar for the meeting "description / agenda" rich editor. Ported from
// the task editor (window/tasks/mention-markers.js) and extended with the chat
// "/" file-mention marker so the meeting description supports the full chat set:
//   person mention  → [@Full Name](user:uid)
//   inline image     → ![img](file:NID@HUB|WIDTH)   (HUB, WIDTH optional)
//   file mention     → [@filename](mention:HUB:NID)
// On read-only surfaces (calendar card) markers strip to plain text/glyph.
const USER_SOURCE = "\\[@([^\\]]+)\\]\\(user:([^)]+)\\)";
const IMG_SOURCE =
  "!\\[img\\]\\(file:([^)|@]+)(?:@([^)|]+))?(?:\\|(\\d+))?\\)";
const FILE_SOURCE = "\\[@([^\\]]+)\\]\\(mention:([^:)]+):([^)]+)\\)";

// Fresh /g regex per call — never share one (lastIndex is stateful).
function userRe() {
  return new RegExp(USER_SOURCE, "g");
}
function imgRe() {
  return new RegExp(IMG_SOURCE, "g");
}
function fileRe() {
  return new RegExp(FILE_SOURCE, "g");
}

// Combined token stream for render/serialize. Group map:
//   1=name 2=uid (user) | 3=nid 4=hub 5=width (img) | 6=filename 7=hub 8=nid (file)
function contentTokenRe() {
  return new RegExp(`${USER_SOURCE}|${IMG_SOURCE}|${FILE_SOURCE}`, "g");
}

function imgMarker(nid, hub, width) {
  let s = `![img](file:${nid}`;
  if (hub) s += `@${hub}`;
  if (width) s += `|${Math.round(width)}`;
  return s + ")";
}

// Strip markers for cards/previews: mentions → "@Name", file → "@filename",
// inline images → a neutral glyph.
function stripMarkers(text) {
  if (!text) return "";
  return String(text)
    .replace(userRe(), "@$1")
    .replace(fileRe(), "@$1")
    .replace(imgRe(), "🖼");
}

// Unique mentioned person uids from marker text.
function uidsFromText(text) {
  const uids = [];
  String(text || "").replace(userRe(), (m, name, uid) => {
    if (uid && !uids.includes(String(uid))) uids.push(String(uid));
    return m;
  });
  return uids;
}

module.exports = {
  userRe,
  imgRe,
  fileRe,
  contentTokenRe,
  imgMarker,
  stripMarkers,
  uidsFromText,
};
