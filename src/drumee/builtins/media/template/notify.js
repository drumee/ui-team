// ==================================================================== *
//   Copyright Xialia.com  2011-2021
//   FILE : /src/drumee/builtins/media/template/notify.coffee
//   TYPE : Skeleton
// ==================================================================== *
const __notify = function(m) {
  const pfx = `${m.fig.family}-notify`;
  let html = "";
  
  const c = parseInt(m.new_file) || 0;
  // if not c
  //   return html
  let cdisp = c;
  if (c > 99) {
    cdisp = '9+';
  }
  
  html = `
  <div id="${m._id}-notify"  data-count="${c}" data-service="notifications" class="notification ${pfx}__container"> 
    <div id="${m._id}-notify-count" data-refresh="0" data-type="${m.ext}" class="${pfx}__count notify notify__count"> 
    ${cdisp} 
    </div> 
  </div>`;
  return html;
};

module.exports = __notify;