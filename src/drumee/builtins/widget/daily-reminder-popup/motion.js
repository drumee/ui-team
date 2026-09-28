/**
 * Entrance + per-period idle animation for the daily reminder card.
 *
 * NEVER THROWS and is NEVER load-bearing: the card is fully rendered, numbers
 * included, before this runs. On reduced motion, a missing gsap or any error,
 * it does nothing and the static card stands.
 *
 * The count-up starts its numbers at 0 and kill() puts every one back to its
 * final value, so closing the card mid-count — or a tween that never finishes
 * — can never leave a wrong number on screen.
 *
 * `gsap` is injectable so node tests can run without a DOM.
 */
const P = ".daily-reminder-popup";
// `started` tells the widget whether to try again next frame: only a card
// that is not in the DOM yet is worth a retry. Reduced motion, a missing gsap
// or an error all mean "done — the static card stands".
const NOOP = { started: true, kill() {} };
const NOT_MOUNTED = { started: false, kill() {} };

function prefersReduced() {
  try {
    return !!(typeof window !== "undefined" && window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  } catch (e) {
    return false;
  }
}

function all(root, sel) {
  return Array.from(root.querySelectorAll(sel) || []);
}

// One gentle loop per time of day, started once the entrance has landed.
function idleFor(gsap, root, period) {
  const hero = root.querySelector(`${P}__hero`);
  const bits = all(root, `${P}__bit`);
  const loop = { repeat: -1, yoyo: true, ease: "sine.inOut" };
  const tweens = [];
  if (!hero) return tweens;
  switch (period) {
    case "morning": // the sun bobs and turns a little
      tweens.push(gsap.to(hero, { ...loop, y: -4, rotation: 6, duration: 1.6 }));
      break;
    case "noon": // high sun pulses, the confetti glints
      tweens.push(gsap.to(hero, { ...loop, scale: 1.06, duration: 1.2 }));
      if (bits.length) tweens.push(gsap.to(bits, { ...loop, opacity: 0.4, duration: 0.9, stagger: 0.2 }));
      break;
    case "afternoon": // the cloud drifts
      tweens.push(gsap.to(hero, { ...loop, x: 6, duration: 2.4 }));
      break;
    default: // evening: the moon sways, the confetti twinkles like stars
      tweens.push(gsap.to(hero, { ...loop, rotation: -8, duration: 2 }));
      if (bits.length) tweens.push(gsap.to(bits, { ...loop, opacity: 0.25, scale: 0.7, duration: 1.4, stagger: 0.3 }));
  }
  return tweens;
}

function play(root, period, opt = {}) {
  try {
    if (!root) return NOOP;
    const reduced = opt.reduced != null ? opt.reduced : prefersReduced();
    if (reduced) return NOOP;
    const gsap = opt.gsap || require("gsap").gsap;
    if (!gsap || typeof gsap.timeline !== "function") return NOOP;
    // Feeding is not guaranteed to have mounted the kids yet; handing gsap
    // null targets only earns console warnings.
    if (!root.querySelector(`${P}__card`)) return NOT_MOUNTED;

    let dead = false;
    let idle = [];
    const nums = all(root, `${P}__stat-num`).map((el) => ({
      el,
      target: Math.max(0, Math.floor(Number(el.getAttribute("data-count")) || 0)),
    }));
    const settle = () => {
      for (const { el, target } of nums) el.textContent = String(target);
    };

    const tl = gsap.timeline();
    tl.from(root.querySelector(`${P}__card`), { opacity: 0, y: 24, scale: 0.96, duration: 0.35, ease: "power3.out" })
      .from(root.querySelector(`${P}__hero`), { y: -30, scale: 0.4, opacity: 0, duration: 0.6, ease: "back.out(2)" }, 0.15)
      .from(all(root, `${P}__bit`), { scale: 0, opacity: 0, duration: 0.4, stagger: 0.05, ease: "back.out(3)" }, 0.35)
      .from(all(root, `${P}__stat`), { y: 10, opacity: 0, duration: 0.35, stagger: 0.08 }, 0.45)
      .from(all(root, `${P}__calrow, ${P}__btn`), { y: 8, opacity: 0, duration: 0.3, stagger: 0.06 }, 0.6);

    for (const { el, target } of nums) {
      el.textContent = "0";
      const box = { v: 0 };
      tl.to(box, {
        v: target,
        duration: 0.8,
        ease: "power2.out",
        onUpdate() { el.textContent = String(Math.round(box.v)); },
        onComplete() { el.textContent = String(target); },
      }, 0.5);
    }

    tl.call(() => {
      if (!dead) idle = idleFor(gsap, root, period);
    });

    return {
      started: true,
      kill() {
        dead = true;
        try { tl.kill(); } catch (e) { /* ignore */ }
        for (const t of idle) { try { t.kill(); } catch (e) { /* ignore */ } }
        idle = [];
        settle();
      },
    };
  } catch (e) {
    return NOOP;
  }
}

module.exports = { play };
