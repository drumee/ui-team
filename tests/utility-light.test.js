// utility-light.test.js — lighting a topbar utility icon without a click.
//
//   node --test tests/utility-light.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const {
  UTILITY_BUTTONS,
  UTILITY_CHANNEL,
  lightUtilityButton,
} = require("../src/drumee/libs/utility-light");

const view = (over = {}) => ({ el: {}, isDestroyed: () => false, ...over });

function harness(parts) {
  const sent = [];
  return {
    sent,
    host: {
      getPart: (pn) => parts[pn] || null,
      broadcast: (channel, v) => sent.push([channel, v]),
    },
  };
}

test("maps the six screens to their buttons", () => {
  assert.deepEqual(UTILITY_BUTTONS, {
    "toggle-activity": "utility-activity",
    "toggle-calendar": "utility-calendar",
    "toggle-inbox": "utility-inbox",
    "toggle-contacts": "utility-contacts",
    "toggle-trash": "utility-trash",
    "toggle-apps": "utility-apps",
  });
  assert.equal(UTILITY_CHANNEL, "topbar-utility-radio");
});

test("broadcasts the button on the topbar radio channel", () => {
  const btn = view();
  const { sent, host } = harness({ "utility-trash": btn });
  assert.equal(lightUtilityButton("toggle-trash", host), true);
  assert.deepEqual(sent, [["topbar-utility-radio", btn]]);
});

test("a service with no topbar icon is a no-op", () => {
  const { sent, host } = harness({});
  for (const s of ["toggle-settings", "toggle-help", "upgrade-plan", undefined]) {
    assert.equal(lightUtilityButton(s, host), false);
  }
  assert.deepEqual(sent, []);
});

test("no cluster mounted (mobile): no-op, no throw", () => {
  const { sent, host } = harness({});
  assert.equal(lightUtilityButton("toggle-calendar", host), false);
  assert.deepEqual(sent, []);
});

test("a destroyed or el-less button is skipped", () => {
  const { sent, host } = harness({
    "utility-inbox": view({ isDestroyed: () => true }),
    "utility-apps": view({ el: null }),
  });
  assert.equal(lightUtilityButton("toggle-inbox", host), false);
  assert.equal(lightUtilityButton("toggle-apps", host), false);
  assert.deepEqual(sent, []);
});

test("a throwing getPart does not escape", () => {
  const host = {
    getPart: () => {
      throw new Error("boom");
    },
    broadcast: () => assert.fail("must not broadcast"),
  };
  assert.equal(lightUtilityButton("toggle-activity", host), false);
});

// The user can press a cluster icon while the restore is still mounting its
// screen; the restore must not take that press back.
const lit = (over = {}) => view({ state: 1, ...over });
function pressHarness(parts, { busy = false } = {}) {
  const h = harness(parts);
  h.host.isLit = (v) => v.state === 1;
  h.host.isBusy = () => busy;
  return h;
}

test("another icon already lit (user pressed it): no broadcast", () => {
  const { sent, host } = pressHarness({ "utility-trash": view(), "utility-contacts": lit() });
  assert.equal(lightUtilityButton("toggle-trash", host), false);
  assert.deepEqual(sent, []);
});

test("cluster busy loading a pressed icon: no broadcast", () => {
  const { sent, host } = pressHarness({ "utility-calendar": view() }, { busy: true });
  assert.equal(lightUtilityButton("toggle-calendar", host), false);
  assert.deepEqual(sent, []);
});

test("its own icon already lit still broadcasts", () => {
  const btn = lit();
  const { sent, host } = pressHarness({ "utility-inbox": btn });
  assert.equal(lightUtilityButton("toggle-inbox", host), true);
  assert.deepEqual(sent, [["topbar-utility-radio", btn]]);
});
