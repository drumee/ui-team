// ==================================================================== *
//   Copyright Xialia.com  2011-2026
//   FILE : builtins/player/widget/details
//   TYPE : Behaviour
// ==================================================================== *

/**
 * The "Get info" Details card, as a player owns it.
 *
 * Shared by all five players so the card behaves the same everywhere:
 * docked under the player's header, always smaller than the player, and
 * gone when the player closes.
 *
 * The card is a separate WM window and cannot simply be handed a parent:
 *
 *   - `Wm.launch` returns a boolean and appends to its pool
 *     asynchronously, so there is no instance to capture at call time.
 *   - `source` never reaches it: the singleton branch of `launch` appends
 *     the raw arg and returns before the `opt.trigger = opt.source` line.
 *   - listening for the card's destruction is brittle too: it is a
 *     singleton the WM reuses, so a handler bound at open time can outlive
 *     or miss the instance actually on screen.
 *
 * So it is found afterwards by the `wm_unique_id` that
 * `media.openDetailsWindow()` assigns. `close` recomputes that id rather
 * than relying on a handle saved by `open`: the card's chunk is lazy
 * loaded, so on a first open it can appear long after the click, and an
 * adopt that timed out must not mean the card is left orphaned.
 */

// Breathing room between the card and the player's edges.
const GAP = 16;
const PREFERRED_WIDTH = 420;
const MIN = { width: 260, height: 160 };

// The card's chunk is fetched on first use; be generous.
const ADOPT_TIMEOUT = 15000;
const ADOPT_INTERVAL = 60;

/** The node id the card's `wm_unique_id` is built from. */
function nodeId(ui) {
  const media = ui.media;
  if (media && !media.isDestroyed()) {
    const id = media.mget(_a.nid);
    if (id) return id;
  }
  return ui.mget(_a.nid);
}

function findCard(ui) {
  const nid = nodeId(ui);
  if (!nid) return null;
  const card = Wm.getItemsByAttr("wm_unique_id", `window_media_details-${nid}`)[0];
  return card && !card.isDestroyed() ? card : null;
}

/** Rendered and measurable — the card feeds its rows after a fetch. */
function isReady(card) {
  const box = card.el && card.el.querySelector(".window-media-details__container");
  return !!(box && box.scrollHeight);
}

/**
 * Cap the card to the player's box and park it under the header.
 * Always strictly smaller than the player, on both axes.
 */
function place(ui, card) {
  const el = ui.el;
  if (!el) return;

  const win = el.getBoundingClientRect();
  if (!win.width || !win.height) return;

  const header =
    el.querySelector(`.${ui.fig.group}__header.main`) ||
    el.querySelector(`.${ui.fig.group}__header`);
  const hb = header ? header.getBoundingClientRect() : win;

  // Stops the card re-centring itself once it measures its own height.
  card._anchored = 1;

  const maxWidth = Math.max(MIN.width, Math.round(win.width) - 2 * GAP);
  const maxHeight = Math.max(MIN.height, Math.round(win.bottom - hb.bottom) - 2 * GAP);
  const width = Math.min(PREFERRED_WIDTH, maxWidth);

  if (_.isFunction(card.constrainTo)) {
    card.constrainTo({ width, maxHeight });
  }

  // Centre on what the card ACTUALLY measures, not on the width we asked
  // for. If the width could not be applied — the preset's geometry lands
  // late and has overwritten it before — centring on the request shifts the
  // card by half the difference, which reads as a lean to the right.
  const rect = card.el ? card.el.getBoundingClientRect() : null;
  const actualWidth = Math.round((rect && rect.width) || width);
  const height = Math.round(
    (rect && rect.height) || (card.size && card.size.height) || 0,
  );

  const left = Math.max(
    0,
    Math.min(
      Math.round(hb.left + (hb.width - actualWidth) / 2),
      Math.max(0, window.innerWidth - actualWidth),
    ),
  );
  const top = Math.max(
    0,
    Math.min(
      Math.round(hb.bottom + GAP / 2),
      Math.max(0, window.innerHeight - height),
    ),
  );

  card.style.set({ left, top });
  card.$el.css({ left, top });
}

function adopt(ui, deadline) {
  if (!ui || ui.isDestroyed()) return;
  const card = findCard(ui);
  if (card && isReady(card)) {
    place(ui, card);
    return;
  }
  if (Date.now() < deadline) {
    setTimeout(() => adopt(ui, deadline), ADOPT_INTERVAL);
  }
}

/**
 * Open the node's Details card from `ui`, then dock and size it.
 * A hub or folder gets its own info window instead, unchanged.
 */
function open(ui) {
  const media = ui.media;
  if (!media || media.isDestroyed()) return;
  if (media.isHubOrFolder) return media.openInfoWindow();
  if (!_.isFunction(media.openDetailsWindow)) return;
  media.openDetailsWindow();
  adopt(ui, Date.now() + ADOPT_TIMEOUT);
}

/** Close the card belonging to this player's node, if it is up. */
function close(ui) {
  const card = findCard(ui);
  if (card && _.isFunction(card.goodbye)) card.goodbye();
}

module.exports = { open, close };
