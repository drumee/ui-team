/**
 * The `skip` filter for a window's file list (List.Smart prepareData drops
 * every row matching any key), shared by the grid (toolkit gridFilesBrowser),
 * the row view (content/row) and the show/hide hidden files toggle (core).
 *
 * A scheduled meeting is stored as an MFS node (room.book → category
 * 'schedule') in the workspace home dir, so it lands in the listing with no
 * content and no viewer — rows that can't be opened. Never list them, not even
 * under showHidden, which is about dotfiles only.
 * mfs_show_node_by aliases the column as `m.category AS ftype`; other list
 * sources pass it through unaliased, so both keys are checked.
 *
 * @param {Boolean} [showHidden] defaults to the stored preference
 * @returns {Object}
 */
function fileListSkip(showHidden = !!localStorage.getItem("showHidden")) {
  const skip = { ftype: "schedule", category: "schedule" };
  if (!showHidden) skip.filename = /^\./;
  return skip;
}

module.exports = { fileListSkip };
