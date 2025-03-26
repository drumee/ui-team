
const __skl_topic = function(_ui_) {
  let needle, state;
  if (_ui_.mget(_a.state)) {
    state = _a.open;
  } else {
    state = _a.closed; 
  }

  triggerClass = _ui_.mget('triggerClass') || ''
  const a = [
    Skeletons.Box.X({
      className : `${_ui_.fig.family}-trigger menu-trigger`,
      fork      : _a.part, 
      sys_pn    : _a.trigger,
      level     : _K.level.trigger,
      kidsOpt   : {
        radio     : _a.parent
      }
    })
  ];
  const opt = { 
    radio     : _a.parent,
    className : `${_ui_.fig.family}-items menu-items`,
    fork      : _a.part, 
    sys_pn    : _a.items,
    level     : _K.level.item,
    dataset      : {
      state
    }
  };
  itemsClass = _ui_.mget('itemsClass') || ''
  if ((needle = _ui_.mget(_a.axis), [_a.x, _a.horizontal, _a.row].includes(needle))) {
    a.push(Skeletons.Box.X({
      className : `${_ui_.fig.family}-items__wrapper ${itemsClass}`,
      sys_pn : 'items-wrapper',
      dataset      : {
        state
      },
      kids : [Skeletons.Box.X(opt)]
    }));
  } else { 
    a.push(Skeletons.Box.Y({
      className : `${_ui_.fig.family}-items__wrapper ${itemsClass}`, 
      sys_pn : 'items-wrapper',
      dataset      : {
        state,
        direction : _ui_.mget(_a.direction)
      },
      kids : [Skeletons.Box.Y(opt)]
    }));
  }

  return a;
};


module.exports = __skl_topic