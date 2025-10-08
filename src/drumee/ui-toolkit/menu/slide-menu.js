// require("./style.scss")

const toolKitClass = "drumee-ui-toolkit slide-menu";

function buildItems(ui, flow, items) {
  const pfx = `${ui.fig.family}__menu-items ${toolKitClass}__menu-items`;
  let kids = []
  for (let item of items) {
    let icon = item.ico || item.icon;
    if (icon) {
      let cn = item.className || "";
      kids.push(
        Skeletons.Button.Label({
          ...item,
          className: `${pfx}--item ${cn}`,
          label: item.label || item.content || "",
        })
      )
    } else {
      kids.push(
        Skeletons.Note({
          ...item,
          className: `${pfx}--item ${cn}`,
          content: item.content || item.label || "",
        })
      )
    }
  }

  return Skeletons.Box.Y({
    debug: __filename,
    className: `${pfx} `,
    flow,
    kids
  });
};

export function slideMenu(ui, opt) {
  const pfx = `${ui.fig.family}__menu-items ${toolKitClass}`;
  let {
    trigger,
    persistence = _a.once,
    service,
    opening = _e.click,
    sys_pn,
    flow = _a.y,
    axis,
    direction = _a.down,
    items,
    offsetY = 0
  } = opt;
  trigger = trigger || Skeletons.Box.X({
    className: `${pfx}__menu-trigger`
  });
  
  if (!trigger.kind) {
    let cn = trigger.className || ""
    trigger.className = `${pfx}__menu-trigger ${cn}`
    trigger = Skeletons.Note({ ...trigger })
  }

  axis = axis || flow;

  return Skeletons.Box.X({
    className: `${pfx}__menu-wrapper`,
    debug: __filename,
    kids: [{
      kind: KIND.menu.topic,
      className: `${pfx}__menu-main`,
      flow,
      opening,
      service,
      sys_pn,
      direction,
      offsetY,
      persistence,
      trigger,
      items: buildItems(items),
    }]
  });
};
