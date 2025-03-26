//-------------------------------------
// 
//-------------------------------------

const list_table = function (_ui_) {
  const { family } = _ui_.fig;
  device = Visitor.device();
  const body = `<div id="${_ui_._id}-container" data-device="${device}" class="box table-body ${family}__container"></div>`;
  const header = `<div id="${_ui_._id}-header" data-device="${device}" class="box ${family}__header "></div>`;

  const html = `<div class="${family}__main">${header}${body}</div>`;
  return html;
};

module.exports = list_table;