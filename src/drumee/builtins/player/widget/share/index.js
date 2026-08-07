// ==================================================================== *
//   Copyright Xialia.com  2011-2026
//   FILE : builtins/player/widget/share
//   TYPE : Behaviour
// ==================================================================== *

/**
 * Sharing a file from a player topbar.
 *
 * A file only leaves the org through an EXTERNAL workspace. Asking to share
 * one that lives in an internal workspace is not an error to swallow — the
 * user is told what to do instead, with the "External File Sharing" modal
 * (Figma 3228:281742 / 3268:28098).
 *
 * External is the shared-area set the DMZ already defines — `share`, `dmz`,
 * `public` — reused from `dmz/sharebox/area` rather than restated here, so
 * the two cannot drift.
 *
 * Plain DOM, like topbar/rename.js. A transient dialog needs none of the
 * WM machinery, and building it this way avoids registering a Kind in
 * seeds.js for something that lives for one click.
 */

require("./skin");

const { isSharedArea } = require("dmz/sharebox/area");

const CN = "player-share-restricted";

/**
 * The node's area — `share`, `dmz`, `public`, `private`, `personal`, …
 *
 * `_a` is a `createSafeObject` proxy: a key it does not define resolves to
 * its own NAME, so `_a.area` is the string "area". Reading through it is
 * therefore correct and the same as the literal; both are used here only
 * because the fallback already appears elsewhere in the tree.
 *
 * The MFS view is asked first — it is the node, where the player is a view
 * of it and may not carry the attribute.
 */
function areaOf(ui) {
  const media = ui.media && !ui.media.isDestroyed() ? ui.media : null;
  const read = (v) => v && (v.mget(_a.area) || v.mget("area"));
  return read(media) || read(ui) || "";
}

/**
 * Is this file in an external workspace, i.e. may it be shared out?
 *
 * Note the deliberate difference from `isSharedArea`, which treats a MISSING
 * area as shared: that helper is display-only (which chrome to paint), where
 * guessing wrong is cosmetic. Here the answer gates sharing, so an unknown
 * area is treated as internal and the user gets the explanation rather than
 * a share they may not be entitled to.
 */
function isExternal(ui) {
  const area = areaOf(ui);
  return !!area && isSharedArea(String(area));
}

/** Remove the modal, if it is up. */
function close() {
  const el = document.querySelector(`.${CN}`);
  if (el && el.parentElement) el.parentElement.removeChild(el);
}

/**
 * The "External File Sharing" modal.
 * Dismissed by the button, the backdrop, or Escape.
 */
function open() {
  close();

  const root = document.createElement("div");
  root.className = CN;
  root.innerHTML = `
    <div class="${CN}__backdrop"></div>
    <div class="${CN}__modal" role="dialog" aria-modal="true">
      <div class="${CN}__badge">
        <svg class="${CN}__badge-icon"><use href="#--icon-ctxmenu-share"></use></svg>
      </div>
      <div class="${CN}__heading">
        <h2 class="${CN}__title"></h2>
        <p class="${CN}__body"></p>
      </div>
      <button type="button" class="${CN}__cta"></button>
    </div>`;

  // Text via textContent, never interpolated into the markup above — a
  // filename or a translation must never be able to inject nodes.
  root.querySelector(`.${CN}__title`).textContent =
    LOCALE.EXTERNAL_FILE_SHARING || "External File Sharing";
  root.querySelector(`.${CN}__body`).textContent =
    LOCALE.EXTERNAL_FILE_SHARING_HINT ||
    "If you want to share this file to external guest. Please create external workspace, upload this files and share to external guest";
  const cta = root.querySelector(`.${CN}__cta`);
  cta.textContent = LOCALE.GOT_IT || "Got it";

  const dismiss = (e) => {
    if (e) e.stopPropagation();
    document.removeEventListener("keydown", onKey, true);
    close();
  };
  function onKey(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      dismiss();
    }
  }

  cta.addEventListener("click", dismiss);
  root.querySelector(`.${CN}__backdrop`).addEventListener("click", dismiss);
  // The players raise/drag on stray clicks; nothing here should reach them.
  root.addEventListener("mousedown", (e) => e.stopPropagation());
  document.addEventListener("keydown", onKey, true);

  document.body.appendChild(root);
  cta.focus();
}

/**
 * What the gear menu's Share row does.
 *
 * External workspace — hand the row to the source MFS view, which owns the
 * real share flow. Otherwise explain why it cannot be shared from here.
 *
 * @param {object} ui   the player
 * @param {object} cmd  the row that was clicked
 */
function click(ui, cmd) {
  if (!isExternal(ui)) return open();
  if (_.isFunction(ui._delegate) && ui._delegate(cmd)) return;
}

module.exports = { click, open, close, isExternal };
