// ==================================================================== *
//   Copyright Xialia.com  2011-2026
//   FILE : builtins/player/widget/share
//   TYPE : Behaviour
// ==================================================================== *

/**
 * Sharing a file from a player topbar.
 *
 * The Share row opens the secure-share panel (`click`). The "External File
 * Sharing" modal (`open`, Figma 3228:281742 / 3268:28098) is kept for callers
 * that still need to explain external workspaces, but the Share row no
 * longer leads to it.
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
const loading = require("./loading");

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
 * This now only decides whether the document menu shows its share-area Share
 * row. An unknown area is treated as internal so that row stays hidden.
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

// How long the loading card stays up at the least (see click below).
const MIN_VISIBLE_MS = 500;
// The fill's own transition (skin), so 100% is seen before the card goes.
const FILL_MS = 250;

/**
 * What the gear menu's Share row does: open the secure-share panel.
 *
 * In every area. This used to open the panel only for an external workspace
 * and show the "External File Sharing" modal (`open` above) everywhere else,
 * but the server never restricted by area — secure_share.create checks only
 * the member's write bit — and the private-area menus now offer Share
 * alongside the Designation link (2026-09-16).
 *
 * The source MFS view goes first: it owns the share tour, which opens the
 * panel as it comes down. When that view is gone — its folder window was
 * closed after the player opened — the panel is launched directly with the
 * minimal item it reads (nid, hub_id, filetype), so the row is never a dead click.
 *
 * LOADING. `window_secure_share` is a lazy chunk (seeds.js), so the first click
 * pays a fetch and parse before anything can appear. A loading card centred
 * on the player (./loading) covers that span: its bar moves on real
 * milestones — the card is up, the chunk has landed (Kind.waitFor, the same
 * handle the desk header's Manage-access button waits on), the panel is being
 * asked for — and it fades as the panel slides in (window/secure-share skin,
 * `data-floating`).
 *
 * It stays up for at least MIN_VISIBLE_MS. A cached chunk resolves in a
 * frame, and a card that flashes for 16ms reads as a glitch rather than as
 * feedback; the floor is short enough that a warm click still feels immediate.
 * A chunk that fails to load still takes the card down and still tries to
 * open, rather than leaving it up.
 *
 * @param {object} ui   the player
 * @param {object} cmd  the row that was clicked
 * @returns {Promise} settles once the panel has been asked for
 */
function click(ui, cmd) {
  const card = loading.show(ui);
  const shownAt = Date.now();
  card.progress(15);
  const warm =
    typeof Kind !== "undefined" && Kind && _.isFunction(Kind.waitFor)
      ? Promise.resolve(Kind.waitFor("window_secure_share")).catch(() => {})
      : Promise.resolve();
  const wait = (ms) => (ms > 0 ? new Promise((r) => setTimeout(r, ms)) : Promise.resolve());
  return warm
    .then(() => {
      card.progress(70);
      return wait(MIN_VISIBLE_MS - (Date.now() - shownAt));
    })
    .then(() => {
      card.progress(100);
      return wait(FILL_MS);
    })
    .then(() => {
      // The panel starts its slide as the card starts its fade: one hand-off,
      // not a gap.
      const hidden = card.hide();
      launch(ui, cmd);
      return hidden;
    })
    .catch((e) => {
      card.hide();
      throw e;
    });
}

function launch(ui, cmd) {
  // `floating` is what makes the panel visible. The MFS view's own Share row
  // renders it as a drawer INSIDE the host folder window (Figma), but a player
  // is a sibling window painted OVER that folder window — same window-manager
  // layer, z 10000 against the folder's 1000 — so the drawer opened correctly
  // and stayed completely hidden behind the player, looking like a dead click.
  // Players therefore ask for the standalone window, which lands above them.
  if (_.isFunction(ui._delegate) && ui._delegate(cmd, { service: "secure-share", floating: 1 })) {
    return;
  }
  const nid = ui.mget(_a.nid);
  Wm.launch(
    {
      kind: "window_secure_share",
      wm_unique_id: `window_secure_share-${nid}`,
      nid,
      hub_id: ui.mget(_a.hub_id),
      filetype: ui.mget(_a.filetype),
      area: ui.mget(_a.area),
      filename: ui.mget(_a.filename),
      // Slides in and out (window/secure-share, `_floating`).
      floating: 1,
      // The panel's header row. A player only ever holds a file.
      subject: "file",
      subject_data: {
        name: ui.mget(_a.filename),
        filetype: ui.mget(_a.filetype),
        ext: ui.mget(_a.ext) || ui.mget("extension"),
        area: ui.mget(_a.area),
      },
    },
    { explicit: 1, singleton: 1 },
  );
}

module.exports = { click, open, close, isExternal };
