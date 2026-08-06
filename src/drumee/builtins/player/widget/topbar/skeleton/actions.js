// ==================================================================== *
//   Copyright Xialia.com  2011-2026
//   FILE : builtins/player/widget/topbar/skeleton/actions
//   TYPE : Skeleton
// ==================================================================== *

/**
 * The right-hand action row.
 *
 * Order is: `before` -> the default block -> `after`. The default block
 * never reorders and nothing can be inserted inside it; a default is
 * removed with `defaults["<key>"] = { visible: false }`.
 *
 * The `defaults` keys are configuration names, not part names — each
 * default emits a fixed `sys_pn` so the part lookups the players already
 * make keep resolving (`ctrl-gear`, `snap-wrapper`, `ctrl-close-window`).
 *
 * `ctrl-close-window` is deliberately not `ctrl-close`: the image
 * player's fullscreen action bar already claims that part name on the
 * same handler (player/image/skeleton/slider.js).
 */

const __action = require("./action");

const DEFAULTS = [
  {
    key: "folder-settings",
    id: "ctrl-gear",
    type: "menu",
    icon: "folder-settings",
    className: "icon gear",
  },
  {
    key: "move-resize",
    id: "snap-wrapper",
    type: "move-resize",
    triggerPn: "ctrl-expand",
  },
  {
    key: "close",
    id: "ctrl-close-window",
    type: "button",
    icon: "cross",
    className: "icon close",
    service: "close-player",
  },
];

/**
 * @param {object} ctx       { ui, cn, wcn, group }
 * @param {object} right     { before: TopbarAction[], after: TopbarAction[] }
 * @param {object} defaults  per-default overrides, keyed by DEFAULTS[].key
 */
const __player_topbar_actions = function (ctx, right, defaults) {
  right = right || {};
  defaults = defaults || {};

  const list = []
    .concat(right.before || [])
    .concat(DEFAULTS.map((d) => Object.assign({}, d, defaults[d.key])))
    .concat(right.after || []);

  const kids = [];
  for (const action of list) {
    const skeleton = __action(ctx, action);
    if (skeleton) kids.push(skeleton);
  }

  return Skeletons.Box.X({
    debug: __filename,
    className: `${ctx.cn}__actions ${ctx.wcn}__actions`,
    sys_pn: "commands",
    kids,
  });
};

module.exports = __player_topbar_actions;
