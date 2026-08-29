const { dialog, tooltips, tabBar, splitBody } = require("../../skeleton/toolkit");


/**
 * A folder window's body.
 *
 * TWO SHAPES, decided by `headless`:
 *
 *   headless — the full-screen WORKSPACE pane (Figma 43:23955). It has no
 *     chrome of its own: the desk topbar is its header (org / breadcrumb /
 *     utility icons) and the desk's left rail is its tab bar (Files / Chat /
 *     Task / Meet / Access). Rendering either here is what made a workspace
 *     still look like a window — a second title row under the desk topbar and
 *     a second set of tabs under the rail that does the same job.
 *
 *   windowed — an explicitly launched popup ("Open in Window", a share, a
 *     player's parent). Unchanged: it is a real window, so it keeps its own
 *     title bar and its own tabs because there is no rail scoped to it.
 *
 * splitBody is common to both — it is the CONTENT (files grid, chat, task
 * board, meeting panel), and showFolderTab switches between those views the
 * same way whichever shape is in play. That is what lets the rail drive a
 * headless pane with no code of its own: the rail calls showFolderTab, and the
 * content swaps in the main screen instead of inside a window.
 */
function grid(ui) {
  const headless = !!ui.mget(_a.headless);

  const body = [tooltips(ui), splitBody(ui), dialog(ui)];

  if (headless) {
    return Skeletons.Box.Y({
      className: `${ui.fig.family}__main ${ui.fig.group}__main`,
      radio: _a.parent,
      debug: __filename,
      kids: body,
    });
  }

  const header = Skeletons.Box.X({
    className: `${ui.fig.family}__header ${ui.fig.group}__header`,
    // Named part so the window can re-feed a fresh topbar in place (e.g. on a
    // live role change) without rebuilding the whole window. Re-feeding the
    // header keeps the header element (and its drag/raise wiring) and only
    // swaps the topbar child.
    sys_pn: "folder-header",
    partHandler: [ui],
    kidsOpt: {
      radio: _a.on,
      uiHandler: [ui],
    },
    service: _e.raise,
    kids: [require("./topbar")(ui)],
  });

  return Skeletons.Box.Y({
    className: `${ui.fig.family}__main ${ui.fig.group}__main drive-popup`,
    radio: _a.parent,
    debug: __filename,
    // Meeting tab (right of Tasks); hidden for share-recipient windows (token).
    kids: [
      header,
      tooltips(ui),
      tabBar(ui, { meeting: !ui.mget(_a.token) }),
      splitBody(ui),
      dialog(ui),
    ],
  });
}
module.exports = grid;
