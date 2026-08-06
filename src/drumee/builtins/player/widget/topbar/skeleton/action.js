// ==================================================================== *
//   Copyright Xialia.com  2011-2026
//   FILE : builtins/player/widget/topbar/skeleton/action
//   TYPE : Skeleton
// ==================================================================== *

/**
 * One TopbarAction -> one skeleton.
 *
 * This is the widget's whole vocabulary. Everything an action can mean is
 * declared here; nothing about what a service *does* lives in this file
 * or anywhere else under the widget. Services bubble to the consumer's
 * `onUiEvent` through `uiHandler`.
 *
 * `move-resize` is not part of the public TopbarAction union — it is the
 * internal type the default block uses so `actions.js` can treat all
 * three defaults uniformly.
 */

const __menu = require("./menu");
const __moveResize = require("./move-resize");

/**
 * @param {object} ctx     { ui, cn, wcn, group }
 * @param {object} action  TopbarAction
 * @returns {object|null}  skeleton, or null when the action renders nothing
 */
const __player_topbar_action = function (ctx, action) {
  if (!action || action.visible === false) return null;

  const { ui } = ctx;

  switch (action.type) {
    case "menu":
      return __menu(ctx, action);

    case "move-resize":
      return __moveResize(ctx, action);

    case "custom": {
      const component = action.component;
      if (_.isFunction(component)) return component(ui, ctx);
      return component || null;
    }

    default: {
      const dataset = Object.assign({}, action.dataset);
      if (action.disabled) dataset.state = _a.disable;

      const props = {
        sys_pn: action.id,
        className: action.className || "icon",
        uiHandler: ui,
      };

      if (action.icon) props.ico = action.icon;
      if (action.service) props.service = action.service;
      // The framework's own click hook, for actions that want to run
      // something locally instead of routing a service.
      if (action.handler) props.on_click = action.handler;
      if (action.value !== undefined) props.value = action.value;
      if (!_.isEmpty(dataset)) props.dataset = dataset;

      // Straight pass-throughs to Button.Svg. `icons` + `state` drive the
      // framework's own two-state icon swap (maximise/restore); `tooltips`
      // is the hover bubble; `partHandler` registers the button as a part
      // of the consumer so it can be addressed later.
      if (action.tooltips) props.tooltips = action.tooltips;
      if (action.icons) props.icons = action.icons;
      if (action.state != null) props.state = action.state;
      if (action.partHandler) props.partHandler = action.partHandler;
      if (action.style) props.style = action.style;

      if (action.label) {
        props.label = action.label;
        return Skeletons.Button.Label(props);
      }
      return Skeletons.Button.Svg(props);
    }
  }
};

module.exports = __player_topbar_action;
