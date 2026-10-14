// The phone layout axis and the phone callout's placement (host-kit).
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const hk = require(path.join(__dirname, "..", "src/drumee/modules/desk/tutorial/host-kit.js"));

const R = (left, top, width, height) => ({ left, top, width, height, right: left + width, bottom: top + height });
const HOST = R(0, 0, 390, 844);

test("layoutFor: 759 is phone, 760 is desk", () => {
  assert.equal(hk.layoutFor(390), "phone");
  assert.equal(hk.layoutFor(759), "phone");
  assert.equal(hk.layoutFor(760), "desk");
  assert.equal(hk.layoutFor(0), "desk"); // unmeasured box never forces phone
});

test("phoneAnchor: full width with 16px margins, below the target when it fits", () => {
  const a = hk.phoneAnchor(R(16, 200, 358, 48), HOST, { height: 180 });
  assert.equal(a.direction, "north");
  assert.equal(a.style.left, "16px");
  assert.equal(a.style.width, "358px");
  assert.equal(a.style.top, `${248 + 14}px`);
  assert.equal(a.beakPx, 179); // target centre 195 - card left 16
});

test("phoneAnchor: flips above when below does not fit", () => {
  const a = hk.phoneAnchor(R(16, 700, 358, 48), HOST, { height: 180 });
  assert.equal(a.direction, "south");
  assert.equal(a.style.bottom, `${844 - 700 + 14}px`);
  assert.equal(a.style.top, undefined);
});

test("phoneAnchor: clamps when neither side fits (short phone)", () => {
  const short = R(0, 0, 375, 400);
  const a = hk.phoneAnchor(R(16, 150, 343, 100), short, { height: 260 });
  const top = parseInt(a.style.top || "0", 10);
  assert.ok(top + 260 <= 400 - 12, `card bottom ${top + 260} must stay on screen`);
  assert.ok(top >= 12);
});

test("phoneAnchor: beak clamped 24px inside the card", () => {
  const a = hk.phoneAnchor(R(0, 200, 20, 20), HOST, { height: 120 });
  assert.equal(a.beakPx, 24);
  const b = hk.phoneAnchor(R(380, 200, 10, 20), HOST, { height: 120 });
  assert.equal(b.beakPx, 358 - 24);
});

test("phoneAnchor: small bottom-right target (FAB) puts the card on its left", () => {
  const fab = R(320, 700, 54, 54);
  const a = hk.phoneAnchor(fab, HOST, { height: 80 });
  assert.equal(a.direction, "east");
  assert.equal(a.style.right, `${390 - 320 + 14}px`);
  assert.equal(a.style.width, `${Math.min(336, 320 - 16 - 14)}px`);
  assert.equal(a.style.bottom, `${844 - 754}px`); // card bottom level with the FAB bottom
  assert.equal(a.beakPx, 80 - 27); // FAB centre measured from the card top
});

test("phoneAnchor: small bottom-left target (chat +) puts the card on its right", () => {
  const plus = R(16, 780, 44, 44);
  const a = hk.phoneAnchor(plus, HOST, { height: 200 });
  assert.equal(a.direction, "west");
  assert.equal(a.style.left, `${60 + 14}px`);
});

test("buildStepWidgets stamps layout, default desk", () => {
  const ui = { mget: () => null };
  const t = { steps: [{ kind: "tutorial_chat", screens: 5 }] };
  assert.equal(hk.buildStepWidgets(ui, t)[0].layout, "desk");
  assert.equal(hk.buildStepWidgets(ui, t, { layout: "phone" })[0].layout, "phone");
});

test("phoneAnchor prefer:'above' puts the card over the target when it fits (Figma workspace frames)", () => {
  const a = hk.phoneAnchor(R(16, 500, 358, 80), HOST, { height: 100 }, { prefer: "above" });
  assert.equal(a.direction, "south");
  assert.equal(a.style.bottom, `${844 - 500 + 14}px`);
});

test("phoneAnchor prefer:'above' falls back below when above does not fit", () => {
  const a = hk.phoneAnchor(R(16, 60, 358, 40), HOST, { height: 200 }, { prefer: "above" });
  assert.equal(a.direction, "north");
});
