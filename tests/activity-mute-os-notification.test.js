// activity-mute-os-notification.test.js — a muted chat raises no OS
// notification and plays no sound, not just no in-app card.
//   node --test tests/activity-mute-os-notification.test.js
//
// The activity panel only loads inside the bundle, so its _notify method is
// cut out of the source and run against fakes, with ./mute (the real cache)
// and a stubbed chat card.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

global.RADIO_BROADCAST = { trigger: () => {} };
global.SERVICE = {
  activity: { mute_set: "activity.mute_set", mute_state: "activity.mute_state" },
  chat: { post: "chat.post" },
  channel: { post: "channel.post" },
};
const sounds = [];
const notifications = [];
global.Visitor = {
  id: "me0000000000000a",
  avatar: () => "",
  playSound: (s) => sounds.push(s),
};
global.LOCALE = { NEW_MESSAGE: "New message" };
global._K = { notifications: { drip: "drip" } };
global.window = { focus() {} };
global.window.Notification = global.Notification = class {
  constructor(title, opt) {
    notifications.push([title, opt]);
  }
};
global.Notification.permission = "granted";

const M = require("../src/drumee/builtins/panel/activity/mute");

function loadNotify() {
  const src = fs.readFileSync(
    path.join(__dirname, "../src/drumee/builtins/panel/activity/index.js"),
    "utf8",
  );
  const at = src.indexOf("\n  _notify(data = {}) {");
  assert.ok(at > 0, "_notify not found");
  const end = src.indexOf("\n  }\n", at);
  const body = src.slice(src.indexOf(") {", at) + 3, end);
  const toasts = [];
  // eslint-disable-next-line no-new-func
  const fn = new Function("isPopupMuted", "showChatToast", "data = {}", body);
  return {
    toasts,
    notify(host, data) {
      return fn.call(host, M.isPopupMuted, (h, opt) => toasts.push(opt), data);
    },
  };
}

function host() {
  return { _last_notified: 0, debug() {}, warn() {} };
}

test.beforeEach(() => {
  M.resetMuteState();
  sounds.length = 0;
  notifications.length = 0;
});

test("unmuted workspace chat: OS notification and drip fire", () => {
  const { notify } = loadNotify();
  notify(host(), { service: "channel.post", hub_id: "h1", author_id: "u2", message: "hi", firstname: "Ann" });
  assert.equal(notifications.length, 1);
  assert.deepEqual(sounds, ["drip"]);
});

test("muted workspace: no card, no OS notification, no drip", () => {
  M.applyMuteState({ global: 0, hubs: ["h1"] });
  const { notify, toasts } = loadNotify();
  notify(host(), { service: "channel.post", hub_id: "h1", author_id: "u2", message: "hi" });
  assert.equal(toasts.length, 1, "the card is asked; it judges mute itself");
  assert.equal(notifications.length, 0);
  assert.equal(sounds.length, 0);
});

test("another workspace muted: this one still notifies", () => {
  M.applyMuteState({ global: 0, hubs: ["h9"] });
  const { notify } = loadNotify();
  notify(host(), { service: "channel.post", hub_id: "h1", author_id: "u2", message: "hi" });
  assert.equal(notifications.length, 1);
});

test("global mute silences a DM", () => {
  M.applyMuteState({ global: 1, hubs: [] });
  const { notify } = loadNotify();
  notify(host(), { service: "chat.post", author_id: "u2", peer_id: "u2", message: "hi" });
  assert.equal(notifications.length, 0);
  assert.equal(sounds.length, 0);
});

test("muted person silences their DM, not someone else's", () => {
  M.applyMuteState({ global: 0, hubs: [], peers: ["u2"] });
  const { notify } = loadNotify();
  notify(host(), { service: "chat.post", author_id: "u2", message: "hi" });
  assert.equal(notifications.length, 0);
  notify(host(), { service: "chat.post", author_id: "u3", message: "hi" });
  assert.equal(notifications.length, 1);
});

test("mute is a chat setting: a non-chat notification still fires", () => {
  M.applyMuteState({ global: 1, hubs: [] });
  const { notify } = loadNotify();
  notify(host(), { service: "contact.invite", author_id: "u2", message: "invite" });
  assert.equal(notifications.length, 1);
});
