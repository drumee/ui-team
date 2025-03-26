
export function buildContextmenu(p, trigger, e) {
  let kids;
  if (_.isFunction(p.contextmenuSkeleton)) {
    kids = p.contextmenuSkeleton(p, trigger, e);
  } else if (_.isArray(p.contextmenuSkeleton)) {
    kids = p.contextmenuSkeleton;
  } else if (_.isObject(p.contextmenuSkeleton)) {
    kids = [p.contextmenuSkeleton];
  }
  if (_.isString(kids) || _.isEmpty(kids)) {
    return Skeletons.Box.Y({ volatility: 1, style: { display: _a.none } });
  } else if (!_.isArray(kids)) {
    kids = [kids];
  }
  return Skeletons.Box.Y({
    volatility: 4,
    className: `drumee-contextmenu ${p.fig.family}`,
    kids,
    uiHandler: [p],
    style: {
      left: e.pageX,
      top: e.pageY,
      zIndex: 100000
    }
  })
}
