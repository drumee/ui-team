
export default function   (ui){
  const menu = Skeletons.Box.X({ 
    debug     : __filename,
    className : `${ui.fig.family}__header ${ui.fig.group}__header`, 
    sys_pn    : "window-header",
    kidsOpt   : {
      radio     : _a.on,
      uiHandler : ui
    },
    kids      : [ require('./common/topbar').default(ui) ]}); 
  
  const a = require('window/skeleton/content/main')(ui, menu);
  
  return a;
};