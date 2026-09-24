const test = require("node:test");
const assert = require("node:assert/strict");
const { play } = require("../src/drumee/builtins/widget/daily-reminder-popup/motion");

function fakeRoot() {
  const nodes = {};
  const el = (cls) => (nodes[cls] = nodes[cls] || [{ cls, textContent: "7", getAttribute: () => "7" }]);
  return {
    nodes,
    querySelector: (s) => el(s)[0],
    querySelectorAll: (s) => el(s),
  };
}

function fakeGsap() {
  const calls = [];
  const tl = {
    killed: false,
    from(t, v) { calls.push(["from", v]); return tl; },
    to(t, v) { calls.push(["to", v]); if (v.onUpdate) v.onUpdate(); return tl; },
    call(fn) { fn(); return tl; },
    kill() { tl.killed = true; },
  };
  return {
    calls, tl,
    timeline: () => tl,
    to: (t, v) => { calls.push(["idle", v]); return { kill() { calls.push(["idle-kill"]); } }; },
  };
}

test("reduced motion runs no tween and leaves numbers final", () => {
  const g = fakeGsap();
  const root = fakeRoot();
  const h = play(root, "morning", { gsap: g, reduced: true });
  assert.equal(g.calls.length, 0);
  assert.equal(root.querySelector(".daily-reminder-popup__stat-num").textContent, "7");
  h.kill(); // must not throw
});

test("each period starts an idle loop, kill() stops everything", () => {
  for (const p of ["morning", "noon", "afternoon", "evening"]) {
    const g = fakeGsap();
    const h = play(fakeRoot(), p, { gsap: g, reduced: false });
    assert.ok(g.calls.some((c) => c[0] === "idle"), `${p}: no idle loop`);
    h.kill();
    assert.ok(g.tl.killed, `${p}: timeline survived kill`);
    assert.ok(g.calls.some((c) => c[0] === "idle-kill"), `${p}: idle survived kill`);
  }
});

test("idle loops never start once the handle is killed", () => {
  const g = fakeGsap();
  let pending;
  g.tl.call = (fn) => { pending = fn; return g.tl; }; // entrance still running
  const h = play(fakeRoot(), "evening", { gsap: g, reduced: false });
  h.kill();
  pending(); // gsap would not fire it after kill, but be safe if it does
  assert.ok(!g.calls.some((c) => c[0] === "idle"), "idle started after kill");
});

test("never throws — a broken gsap or a null root yields a no-op handle", () => {
  play(null, "noon", { gsap: fakeGsap(), reduced: false }).kill();
  play(fakeRoot(), "noon", { gsap: { timeline() { throw new Error("x"); } }, reduced: false }).kill();
});

test("count-up tweens 0 → data-count and lands on it", () => {
  const g = fakeGsap();
  const root = fakeRoot();
  const num = root.querySelector(".daily-reminder-popup__stat-num");
  play(root, "morning", { gsap: g, reduced: false });
  const tween = g.calls.find((c) => c[0] === "to" && c[1].v === 7);
  assert.ok(tween, "no count-up tween to 7");
  assert.equal(num.textContent, "0"); // starts from zero, no final→0 jump
  tween[1].onComplete();
  assert.equal(num.textContent, "7");
});

test("killing mid-count restores the final numbers", () => {
  const g = fakeGsap();
  const root = fakeRoot();
  const num = root.querySelector(".daily-reminder-popup__stat-num");
  const h = play(root, "morning", { gsap: g, reduced: false });
  assert.equal(num.textContent, "0");
  h.kill();
  assert.equal(num.textContent, "7");
});

test("not mounted yet (no card) → no tweens, and the handle says so", () => {
  const g = fakeGsap();
  const root = { querySelector: () => null, querySelectorAll: () => [] };
  const h = play(root, "noon", { gsap: g, reduced: false });
  assert.equal(g.calls.length, 0);
  assert.equal(h.started, false);
  assert.equal(play(fakeRoot(), "noon", { gsap: fakeGsap(), reduced: false }).started, true);
});
