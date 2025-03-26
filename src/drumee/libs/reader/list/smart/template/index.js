//-------------------------------------
// 
//-------------------------------------
const __list_smart=function(_ui_){
  const html = `<div id="${_ui_._id}-container" data-device="${Visitor.device()}" data-axis="${_ui_.mget(_a.axis)}" 
class="box smart-container ${_ui_.mget(_a.innerClass)} ${_ui_.fig.family}__container"></div>`;
  return html;
};

module.exports = __list_smart;