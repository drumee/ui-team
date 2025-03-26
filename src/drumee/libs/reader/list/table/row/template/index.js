//-------------------------------------
// 
//-------------------------------------
const service = `data-service="cell-click"`
function cell(_ui_, key, value) {
  const { name } = _ui_.fig;
  return `<div ${service} class="cell ${key}">
    <div ${service} class="cell-content ${key}">${value}</div></div>`;
}

const __row = function (_ui_, columns) {

  if (!columns) {
    return ``;
  }
  let content = '';
  for (let k in columns) {
    content = content + cell(_ui_, k, columns[k])
  }
  return content;
};

module.exports = __row;