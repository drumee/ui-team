/* ==================================================================== *
 * org_setup_done
 * The organisation was just set up (onboarding org_setup finished): a
 * fireworks burst over the desk and the CTA towards the org chart -- B2B Org
 * Structure Figma 900:150473 "4. land in admin console + cta org chart",
 * notes "thêm hiệu ứng pháo hoa" and the popup CTA "Start setting up your org
 * chart now".
 *
 * Hosted by Wm's wrapper-modal (Wm "org-setup-done"). The CTA opens the
 * Admin Console on its Org Structure tab.
 * ==================================================================== */

/**
 * A short fireworks burst on a full-screen canvas, then the canvas goes.
 * Skipped for people who asked their system for less motion.
 */
function fireworks(durationMs = 2600) {
  try {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  } catch (e) { /* no matchMedia: animate */ }
  const canvas = document.createElement("canvas");
  Object.assign(canvas.style, {
    position: "fixed", left: "0", top: "0", width: "100%", height: "100%",
    pointerEvents: "none", zIndex: "200000",
  });
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas.remove();
  const dpr = window.devicePixelRatio || 1;
  const W = window.innerWidth;
  const H = window.innerHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const colors = ["#5950ff", "#ff6b8b", "#ffc94d", "#33c58f", "#4fb3ff", "#b06bff"];
  const parts = [];
  const burst = (x, y) => {
    for (let i = 0; i < 80; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 2 + Math.random() * 5;
      parts.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        life: 55 + Math.random() * 45, age: 0,
        c: colors[i % colors.length], r: 1.6 + Math.random() * 2.2,
      });
    }
  };
  [[0.3, 0.32, 0], [0.7, 0.28, 320], [0.5, 0.22, 640], [0.2, 0.48, 960], [0.8, 0.46, 1280]]
    .forEach(([x, y, t]) => setTimeout(() => burst(W * x, H * y), t));

  const start = performance.now();
  const tick = (now) => {
    ctx.clearRect(0, 0, W, H);
    for (const p of parts) {
      p.age++;
      p.vy += 0.06;
      p.vx *= 0.985;
      p.vy *= 0.985;
      p.x += p.vx;
      p.y += p.vy;
      const alpha = Math.max(0, 1 - p.age / p.life);
      if (!alpha) continue;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.c;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (now - start < durationMs || parts.some((p) => p.age < p.life)) requestAnimationFrame(tick);
    else canvas.remove();
  };
  requestAnimationFrame(tick);
}

class __org_setup_done extends LetcBox {

  initialize(opt = {}) {
    require("./skin");
    super.initialize(opt);
    this.declareHandlers();
  }

  onDomRefresh() {
    this.feed(require("./skeleton")(this));
    fireworks();
  }

  _close() {
    if (this.parent && _.isFunction(this.parent.clear)) return this.parent.clear();
    return this.goodbye();
  }

  onUiEvent(cmd, args = {}) {
    const service = args.service || (cmd.get && cmd.get(_a.service));
    switch (service) {
      case _e.close:
      case "org-setup-done-later":
        return this._close();
      case "org-setup-done-chart":
        this._close();
        return RADIO_BROADCAST.trigger("desk:open-admin-console", { tab: "org" });
      default:
        if (super.onUiEvent) super.onUiEvent(cmd, args);
    }
  }
}

module.exports = __org_setup_done;
