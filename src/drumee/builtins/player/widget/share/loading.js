// ==================================================================== *
//   Copyright Xialia.com  2011-2026
//   FILE : builtins/player/widget/share/loading
//   TYPE : Behaviour
// ==================================================================== *

/**
 * The loading card a player shows between a click on Share and the
 * secure-share panel sliding in.
 *
 * THE SAME TEMPLATE as the app's other waiting screens — the logout screen
 * (router/butler/skeleton/goodbye.js) and the plugins loading screen: the
 * Drumee lockup top-left, the message centred, the boot screen's 5px bar under
 * it. Scaled down to a card, and centred on the PLAYER rather than the page:
 * the wait belongs to that window, and a page-wide screen would read as the
 * whole app stalling.
 *
 * A determinate bar, not a spinner, because this wait has real milestones:
 * the card is up, the panel's lazy chunk has landed, the panel has been asked
 * for. `progress()` moves the fill; the CSS transition animates it.
 *
 * Plain DOM, like the "External File Sharing" modal beside it (./index.js):
 * it lives for one click, and a Kind registered in seeds.js would itself be a
 * chunk to wait for — the very wait this card is covering.
 */

const LOGO = require("assets/drumee-logo.svg");

const CN = "player-share-loading";

// Nothing to draw into (no DOM, or a player with no element): every call is
// a no-op, so the click still opens the panel.
const NOOP = { progress() {}, hide: () => Promise.resolve() };

/**
 * Put the card up over the player.
 *
 * @param {object} ui  the player
 * @returns {{progress: function(number): void, hide: function(): Promise}}
 */
function show(ui) {
  const host = ui && ui.el;
  if (typeof document === "undefined" || !host || !host.appendChild) return NOOP;

  // One card per player: a second click while the first is still loading
  // replaces it rather than stacking.
  const stale = host.querySelector(`:scope > .${CN}`);
  if (stale) stale.remove();

  const logo = LOGO.default || LOGO;
  const root = document.createElement("div");
  root.className = CN;
  root.innerHTML = `
    <div class="${CN}__card" role="status" aria-live="polite">
      <div class="${CN}__logo"><img alt="drumee" width="121" height="24"></div>
      <p class="${CN}__message"></p>
      <div class="${CN}__progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
        <div class="${CN}__progress-fill"></div>
      </div>
    </div>`;
  root.querySelector("img").src = logo;
  root.querySelector(`.${CN}__message`).textContent =
    LOCALE.SECURE_SHARE_LOADING || "Preparing secure share…";

  // The player raises and drags on stray presses; the card is not a handle.
  root.addEventListener("mousedown", (e) => e.stopPropagation());

  const bar = root.querySelector(`.${CN}__progress`);
  const fill = root.querySelector(`.${CN}__progress-fill`);
  host.appendChild(root);

  // Entrance: the state flips a frame after insertion, so the transition has
  // a "before" to run from.
  const raf = typeof requestAnimationFrame === "function"
    ? requestAnimationFrame
    : (fn) => setTimeout(fn, 16);
  raf(() => {
    root.dataset.state = "open";
  });

  let hidden = false;
  return {
    progress(pct) {
      if (hidden) return;
      const v = Math.max(0, Math.min(100, Math.round(pct)));
      fill.style.width = `${v}%`;
      bar.setAttribute("aria-valuenow", String(v));
    },
    // Fades out, then leaves the DOM. Resolves once gone — or after a
    // fallback, since a transitionend can be skipped (display:none, a hidden
    // tab, reduced motion with no transition at all).
    hide() {
      if (hidden) return Promise.resolve();
      hidden = true;
      return new Promise((resolve) => {
        let done = false;
        const finish = () => {
          if (done) return;
          done = true;
          root.remove();
          resolve();
        };
        root.addEventListener("transitionend", (e) => {
          if (e.target === root) finish();
        });
        root.dataset.state = "closing";
        setTimeout(finish, 260);
      });
    },
  };
}

module.exports = { show, CN };
