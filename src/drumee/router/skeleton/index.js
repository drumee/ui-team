

const __router_main = function (_ui_) {

  const family = `${_ui_.fig.family}`;
  function skeletons(name, type='Wrapper', flow='Y'){
    return Skeletons[type][flow]({
      className: `${family}__${name}`,
      sys_pn: name,
    })
  }
  
  return Skeletons.Box.Y({
    className: `${family}__main`,
    sys_pn: 'main',
    kids: [
      skeletons('header'),
      skeletons('body', 'Box', 'Y'),
      skeletons('wallpaper', 'Box', 'Y'),
      skeletons('footer'),
      skeletons('modal'),
      skeletons('context'),
      skeletons('dialog'),
      skeletons('tooltips'),
      skeletons('hidden'),
      skeletons('fixed-box'),
  
      Skeletons.Box.Y({
        className: `${family}__sentry`,
        kids: [
          { sys_pn: 'butler', kind: "butler", wrapper: 1 },
          { sys_pn: 'websocket', kind: KIND.ws_channel }
        ]
      })
    ]
  })
};
module.exports = __router_main;
