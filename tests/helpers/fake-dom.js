// tests/helpers/fake-dom.js
// Just enough DOM to run the tasks panel's editor <-> text bridge under plain
// node: element / text / fragment nodes, childNodes, appendChild (a fragment
// moves its children), tagName, classList.contains, dataset, style,
// get/setAttribute and textContent. No layout, no selection.
function text(v) {
  return { nodeType: 3, textContent: String(v) };
}

function appendTo(parent, child) {
  if (child.nodeType === 11) {
    child.childNodes.forEach((c) => parent.childNodes.push(c));
    child.childNodes = [];
  } else {
    parent.childNodes.push(child);
  }
  return child;
}

function el(tag, kids = [], { className = "", dataset = {}, style = {}, attrs = {} } = {}) {
  const n = {
    nodeType: 1,
    tagName: String(tag).toUpperCase(),
    className,
    childNodes: [],
    dataset: { ...dataset },
    style: { ...style },
    attrs: { ...attrs },
    classList: { contains: (c) => n.className.split(/\s+/).includes(c) },
    getAttribute(k) {
      return k in this.attrs ? this.attrs[k] : null;
    },
    setAttribute(k, v) {
      this.attrs[k] = String(v);
    },
    appendChild(c) {
      return appendTo(this, c);
    },
    get textContent() {
      return this.childNodes.map((c) => c.textContent).join("");
    },
    set textContent(v) {
      this.childNodes = v ? [text(v)] : [];
    },
  };
  kids.forEach((k) => n.appendChild(typeof k === "string" ? text(k) : k));
  return n;
}

function fragment() {
  return {
    nodeType: 11,
    childNodes: [],
    appendChild(c) {
      return appendTo(this, c);
    },
  };
}

const document = {
  createElement: (t) => el(t),
  createTextNode: text,
  createDocumentFragment: fragment,
};

// Tag / text tree, for comparing what was drawn: "text" | {tag: [...]}.
function shape(node) {
  return node.childNodes.map((c) =>
    c.nodeType === 3 ? c.textContent : { [c.tagName.toLowerCase()]: shape(c) },
  );
}

module.exports = { el, text, fragment, document, shape };
