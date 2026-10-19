/**
 * Placeholder for the folder window's Files list while its first page loads
 * (folder/icons-loading.js stamps data-loading on the files panel; the folder
 * skin, skin/icons-skeleton.scss, swaps the list for this while it is set).
 *
 * Static markup, laid out to the real geometry so the rows replace it without
 * moving anything: grid tiles are --grid-cell-w × --grid-cell-h-file (card +
 * two meta lines), rows are .media-row__ui's 42px. Decorative — nothing in it
 * is worth announcing.
 */
const GRID_TILES = 12;
const ROW_LINES = 8;

function iconsSkeletonHtml(group, mode) {
  const c = `${group}__icons-skeleton`;
  const line = `<div class="${c}-line"></div>`;
  const short = `<div class="${c}-line ${c}-line--short"></div>`;
  if (mode === "row") {
    const row = `<div class="${c}-row"><div class="${c}-icon"></div>${line}${short}</div>`;
    return `<div class="${c}-rows" aria-hidden="true">${row.repeat(ROW_LINES)}</div>`;
  }
  const tile = `<div class="${c}-tile"><div class="${c}-card"></div>${line}${short}</div>`;
  return `<div class="${c}-grid" aria-hidden="true">${tile.repeat(GRID_TILES)}</div>`;
}

function iconsSkeleton(ui, mode) {
  return Skeletons.Note({
    className: `${ui.fig.group}__icons-skeleton`,
    dataset: { mode },
    content: iconsSkeletonHtml(ui.fig.group, mode),
  });
}

// Shown only at data-search="empty" (skin). The list's own empty view says
// "No Folders or Files yet", which is the folder's resting state, not a query
// that missed.
function searchStatus(ui) {
  return Skeletons.Note({
    className: `${ui.fig.group}__search-status`,
    content: LOCALE.NO_RESULTS,
  });
}

module.exports = { iconsSkeleton, iconsSkeletonHtml, searchStatus, GRID_TILES, ROW_LINES };
