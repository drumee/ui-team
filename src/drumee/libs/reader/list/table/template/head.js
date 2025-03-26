//-------------------------------------
// 
//-------------------------------------
const service = `data-service="sort-colunm"`
function cell(_ui_, key) {
  const { family } = _ui_.fig;
  return `<th ${service} class="${family}__header ${key}">
    <div class="cell ${service}>${key}</div></th>`;
}

const __columns = function (_ui_, keys=[]) {
  let content = '';
  for (let k of keys) {
    content = content + cell(_ui_, k)
  }
  return content;
};

module.exports = __columns;