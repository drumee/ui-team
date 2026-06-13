// Single source of truth for the @-mention marker grammar, shared by the task
// description editor and the comment composer. Stored/serialized form is
// "[@Full Name](user:uid)"; on read-only surfaces it renders as plain "@Name".
const MARKER_SOURCE = "\\[@([^\\]]+)\\]\\(user:([^)]+)\\)";

// Fresh /g regex per call — never share one (lastIndex is stateful).
function markerRe() {
  return new RegExp(MARKER_SOURCE, "g");
}

// Strip markers to plain "@Name" for cards/previews (no raw uid payload leaks).
function stripMarkers(text) {
  if (!text) return "";
  return String(text).replace(markerRe(), "@$1");
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

module.exports = { MARKER_SOURCE, markerRe, stripMarkers, uidsFromText };
