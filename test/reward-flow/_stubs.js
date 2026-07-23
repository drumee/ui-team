// Shared global stubs for reward-flow tests. The widget and its skeletons rely
// on runtime globals injected at app bootstrap; tests install them here.
// `.scss` is neutralised so `static initClass() { require("./skin") }` works.
require.extensions[".scss"] = () => {};

function node(type) {
  return (o = {}) => ({ type, ...o });
}

global.Skeletons = {
  Box: { X: node("Box.X"), Y: node("Box.Y") },
  Wrapper: { X: node("Wrapper.X"), Y: node("Wrapper.Y") },
  Note: node("Note"),
  Image: { Svg: node("Image.Svg") },
  Button: { Svg: node("Button.Svg"), Label: node("Button.Label") },
};

global.LOCALE = require("../../locale/en.json");

global._a = { service: "service", state: "data-state" };
global._e = { upload: "upload", uploaded: "uploaded", destroy: "destroy" };

/** Depth-first collect of every node in a Skeletons tree. */
function flatten(tree) {
  const out = [];
  const walk = (n) => {
    if (!n || typeof n !== "object") return;
    if (Array.isArray(n)) return n.forEach(walk);
    out.push(n);
    if (n.kids) walk(n.kids);
  };
  walk(tree);
  return out;
}

/** All `service` values present in a tree, in document order. */
function services(tree) {
  return flatten(tree).filter((n) => n.service).map((n) => n.service);
}

/** All `content` values present in a tree, in document order. */
function contents(tree) {
  return flatten(tree).filter((n) => n.content != null).map((n) => n.content);
}

/** Nodes whose className contains `frag`. */
function byClass(tree, frag) {
  return flatten(tree).filter(
    (n) => typeof n.className === "string" && n.className.includes(frag),
  );
}

module.exports = { flatten, services, contents, byClass };
