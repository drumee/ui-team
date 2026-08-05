// ==================================================================== *
//   Copyright Xialia.com  2011-2026
//   FILE : builtins/player/widget/topbar/skeleton/menu
//   TYPE : Skeleton
// ==================================================================== *

/**
 * The topbar's dropdown action — a trigger button plus a recursive menu.
 *
 * Level 0 is the framework's own `KIND.menu.topic`
 * (@drumee/ui-core/letc/widgets/menu): it already owns click-to-open,
 * outside-click dismissal via RADIO_CLICK, and placement, so none of that
 * is reimplemented here.
 *
 * Levels 1+ recurse with the pattern the contextmenu already uses
 * (builtins/contextmenu/skeleton/items.js): a row carrying the service,
 * a `›` note, and a nested Box.Y the skin reveals on hover. There is no
 * depth limit — `__row` calls itself.
 *
 * Rows declare `uiHandler: [ui]`, so their services bypass the menu
 * widget and land straight on the consumer's `onUiEvent`. The widget
 * itself never interprets a service.
 */

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

  if (!_.isEmpty(item.children)) {
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

  const trigger = Skeletons.Button.Svg({
    ico: action.icon,
    sys_pn: action.triggerPn,
    className: action.className || "icon",
  });

  const items = Skeletons.Box.Y({
    className: `${wcn}__menu-items ${cn}__menu-items`,
    kids: action.menu.map((item) => __row(ctx, item, 0)),
  });

  return Skeletons.Box.X({
    debug: __filename,
    className: `${wcn}__menu ${cn}__menu`,
    kids: [
      {
        kind: KIND.menu.topic,
        className: `${wcn}__menu-topic ${cn}__menu-topic`,
        // Lands on the widget's items WRAPPER, which is what has to be
        // taken out of flow. Do not reach for the framework's own class
        // instead: the wrapper is named `${fig.family}-items__wrapper`,
        // i.e. `menu-topic-items__wrapper`, and only the INNER box gets a
        // bare `menu-items`. Styling `.menu-items__wrapper` matches
        // nothing, the panel stays in flow inside the 24px action row, and
        // it lays itself over the header with its submenus out of reach.
        itemsClass: `${wcn}__menu-panel ${cn}__menu-panel`,
        flow: _a.y,
        opening: _e.click,
        // Default persistence: any row click closes the menu. Parent rows
        // close it too — submenus are meant to be opened by hover.
        persistence: _a.once,
        sys_pn: action.id,
        service: action.service,
        trigger,
        items,
        offsetY: 8,
      },
    ],
  });
};

module.exports = __player_topbar_menu;
