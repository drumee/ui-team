// ==================================================================== *
//   Copyright Xialia.com  2011-2026
//   FILE : builtins/player/widget/topbar/skeleton/menu
//   TYPE : Skeleton
// ==================================================================== *

/**
 * The topbar's dropdown action — a trigger button plus a recursive menu.
 *
 * Hover opens it; clicking the trigger does nothing. Every level, root
 * included, is plain markup revealed by CSS `:hover`, the same mechanism
 * the Move & Resize panel in this widget already uses.
 *
 * This deliberately does NOT use the framework's `KIND.menu.topic`. That
 * widget is built around click-to-toggle and brings a state machine the
 * topbar has to fight at every turn: it writes `overflow: hidden` inline
 * on its wrapper (clipping submenus away), routes any bubble from the
 * items subtree into a close, gsap-transforms the panel on open/close,
 * and drives hover through its own `opening: flyover` state machine. A
 * hover-only menu needs none of it, and one mechanism for both topbar
 * popovers is easier to reason about than two.
 *
 * Levels 1+ recurse with the pattern the contextmenu already uses
 * (builtins/contextmenu/skeleton/items.js): a row carrying the service,
 * a `›` note, and a nested Box.Y the skin reveals on hover. There is no
 * depth limit — `__row` calls itself.
 *
 * Rows declare `uiHandler: [ui]`, so their services land straight on the
 * consumer's `onUiEvent`. The widget never interprets a service.
 */

// Keeps submenus inside the viewport; see ../flip.js. Idempotent.
const installFlip = require("../flip");

/**
 * One menu row, and — when the item has children — the submenu hanging
 * off it.
 *
 * @param {object} ctx    { ui, cn, wcn }
 * @param {object} item   MenuItem
 * @param {number} depth  0 for the top level
 */
const __row = function (ctx, item, depth) {
  const { ui, cn, wcn } = ctx;

  // A separator carries no label, no service and no children.
  if (item.separator) {
    return Skeletons.Element({
      className: `${wcn}__menu-item ${cn}__menu-item separator`,
    });
  }

  const kids = [];

  if (item.icon) {
    kids.push(
      Skeletons.Image.Svg({
        ico: item.icon,
        className: `${wcn}__menu-icon ${cn}__menu-icon`,
      }),
    );
  }

  kids.push(
    Skeletons.Note({
      content: item.label,
      className: `${wcn}__menu-label ${cn}__menu-label`,
    }),
  );

  const hasChildren = !_.isEmpty(item.children);

  if (hasChildren) {
    kids.push(
      Skeletons.Note({
        content: "›",
        className: `${wcn}__menu-chevron ${cn}__menu-chevron`,
      }),
      Skeletons.Box.Y({
        className: `${wcn}__submenu ${cn}__submenu`,
        kids: item.children.map((child) => __row(ctx, child, depth + 1)),
      }),
    );
  }

  const dataset = Object.assign({ depth }, item.dataset);
  if (item.disabled) {
    dataset.state = _a.disable;
  }

  const props = {
    className: `${wcn}__menu-item ${cn}__menu-item${
      item.className ? ` ${item.className}` : ""
    }`,
    uiHandler: [ui],
    // Kids are inert so a click always resolves to the row, never to the
    // label or icon inside it.
    kidsOpt: { active: 0 },
    dataset,
    kids,
  };

  if (item.id) props.sys_pn = item.id;
  if (item.service) props.service = item.service;
  if (item.value !== undefined) props.value = item.value;
  if (item.type !== undefined) props.type = item.type;

  return Skeletons.Box.X(props);
};

/**
 * @param {object} ctx     { ui, cn, wcn }
 * @param {object} action  TopbarAction with type: "menu"
 */
const __player_topbar_menu = function (ctx, action) {
  const { cn, wcn } = ctx;

  // Nothing to drop down: render nothing rather than an empty popover.
  if (_.isEmpty(action.menu)) {
    return null;
  }

  installFlip();

  // The trigger carries no service: the menu is hover-only, and a click on
  // the icon must do nothing at all.
  const trigger = Skeletons.Button.Svg({
    ico: action.icon,
    sys_pn: action.id,
    className: action.className || "icon",
  });

  const panel = Skeletons.Box.Y({
    className: `${wcn}__menu-panel ${cn}__menu-panel`,
    sys_pn: action.panelPn,
    kids: [
      Skeletons.Box.Y({
        className: `${wcn}__menu-items ${cn}__menu-items`,
        kids: action.menu.map((item) => __row(ctx, item, 0)),
      }),
    ],
  });

  return Skeletons.Box.X({
    debug: __filename,
    className: `${wcn}__menu ${cn}__menu`,
    kids: [trigger, panel],
  });
};

module.exports = __player_topbar_menu;
