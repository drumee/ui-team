// tests/chat-toast-card.test.js — what the direct-message card is built from.
//
//   node --test tests/chat-toast-card.test.js
//
// The sender's face came from Skeletons.Avatar(Visitor.avatar(id)): a
// background image with no fallback, so a sender without a photo got an empty
// square. The close button carried a "Close" tooltip that Figma does not have.
const test = require("node:test");
const assert = require("node:assert/strict");

const node = (type) => (opt = {}) => ({ type, ...opt });
global._ = require("underscore");
global._a = new Proxy({}, { get: (t, k) => k });
const en = require("../locale/en.json");
global.LOCALE = new Proxy(en, { get: (t, k) => (k in t ? t[k] : k) });
global.Skeletons = {
  Box: { X: node("Box.X"), Y: node("Box.Y") },
  Note: node("Note"),
  Image: { Svg: node("Image.Svg") },
  Button: { Svg: node("Button.Svg") },
  Avatar: (src, className, name) => ({ type: "Avatar", src, className, name }),
  // UserProfile takes its own `type` ("thumb"), so tag the fake separately.
  UserProfile: (opt = {}) => ({ ...opt, fake: "UserProfile" }),
};
global.Visitor = { id: "me0000000000000a", avatar: (id) => `/avatar/${id}` };

let mounted = null;
global.Wm = {
  getMeetingToastPool: () => ({ append: (skl) => ((mounted = skl), { el: null }) }),
};

const T = require("../src/drumee/builtins/panel/activity/chat-toast");

const walk = (n, out = []) => {
  if (Array.isArray(n)) { n.forEach((k) => walk(k, out)); return out; }
  if (!n || typeof n !== "object") return out;
  out.push(n);
  (n.kids || []).forEach((k) => walk(k, out));
  return out;
};
const closeButtons = (skl) =>
  walk(skl).filter((n) => n.type === "Button.Svg" && /__close$/.test(n.className || ""));

test("the sender's avatar falls back to initials (UserProfile), not an empty image", () => {
  const host = {};
  T.showChatToast(host, {
    author_id: "a1",
    firstname: "Quoc Anh",
    lastname: "Vu",
    message: "ê",
  });
  T.killChatToast(host);
  const nodes = walk(mounted);
  assert.equal(nodes.filter((n) => n.type === "Avatar").length, 0);
  const face = nodes.find((n) => n.fake === "UserProfile");
  assert.ok(face, "a UserProfile is rendered");
  assert.equal(face.id, "a1");
  assert.equal(face.firstname, "Quoc Anh");
  assert.equal(face.lastname, "Vu");
});

test("no close button shows a Close tooltip: card and both scope pickers", () => {
  const host = {};
  T.showChatToast(host, { author_id: "a1", firstname: "A", message: "hi" });
  T.killChatToast(host);
  const skeletons = [
    mounted,
    T.buildScopePicker({ author_id: "a1", hub_id: "h1" }, false, 2),
    T.buildScopePicker({ author_id: "a1", hub_id: "h1" }, false, 1),
  ];
  for (const skl of skeletons) {
    const buttons = closeButtons(skl);
    assert.ok(buttons.length > 0);
    for (const btn of buttons) assert.equal(btn.tooltips, undefined);
  }
});
