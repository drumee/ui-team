// ==================================================================== *
//   Copyright Xialia.com  2011-2026
//   FILE : builtins/player/widget/topbar
//   TYPE : Widget
// ==================================================================== *

/**
 * A standard topbar, shared by any module that needs one.
 *
 *   Topbar(ui, {
 *     fig:   { family, group },        // optional, defaults to ui.fig
 *     left:  { fileTypeIcon, title },
 *     right: { before: [], after: [] },
 *     defaults: {
 *       "folder-settings": { menu: [...] },
 *       "move-resize":     { visible: false },
 *       "close":           { service: "close-player" },
 *     },
 *   })
 *
 * It is a skeleton factory, not a LetcBox subclass: it is composed into
 * the consumer's own skeleton, which means it owns no lifecycle and
 * intercepts no events. Every service declared on an action bubbles
 * straight to the consumer's `onUiEvent`, so the widget stays free of
 * business logic and the consumer keeps all of it.
 *
 * Two class names go on every node. `drumee-topbar__*` is stable and is
 * what the skin targets; `{fig.family}-topbar__*` is the consumer's own
 * hook, and matches the markup the image player shipped before this
 * widget existed.
 */

require("./skin");

const __left = require("./skeleton/left");
const __actions = require("./skeleton/actions");

const WIDGET_CN = "drumee-topbar";

/**
 * @param {object} ui      the consuming view
 * @param {object} config  see the module comment
 */
const __ctx = function (ui, config) {
  const fig = config.fig || ui.fig || {};
  return {
    ui,
    fig,
    wcn: WIDGET_CN,
    cn: fig.family ? `${fig.family}-topbar` : WIDGET_CN,
    group: fig.group || WIDGET_CN,
  };
};

/**
 * @param {object} ui      the consuming view — receives every service
 * @param {object} config  see the module comment
 */
const __player_widget_topbar = function (ui, config) {
  config = config || {};

  const ctx = __ctx(ui, config);

  const kids = [];
  const left = __left(ctx, config.left);
  if (left) kids.push(left);
  kids.push(__actions(ctx, config.right, config.defaults));

  return Skeletons.Box.X({
    debug: __filename,
    className: `${ctx.group}__header container u-jc-sb ${ctx.cn} ${WIDGET_CN}`,
    sys_pn: "topbar",
    justify: _a.right,
    kids: [
      Skeletons.Box.X({
        className: `${ctx.group}__header main u-ai-center ${WIDGET_CN}__bar`,
        service: _e.raise,
        uiHandler: ui,
        kids,
      }),
    ],
  });
};

/**
 * Just the right-hand action row, for consumers that refresh their actions
 * without rebuilding the whole header — feed `.kids` into the `commands`
 * part. Takes the same config, so a consumer can keep one source of truth
 * and hand it to both entry points.
 */
__player_widget_topbar.actions = function (ui, config) {
  config = config || {};
  return __actions(__ctx(ui, config), config.right, config.defaults);
};

module.exports = __player_widget_topbar;
