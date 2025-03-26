// ================================================================== *
//   Copyright Xialia.com  2011-2022
//   FILE : /src/drumee/builtins/window/note/skeleton/index.js
//   TYPE : Skelton
// ===================================================================**/
const fig = 'drumee-md-viewer';
function codeBlock(code){
  return `<code class="${fig} code--line">${code}</code>`
}
const heading = function (text, level) {
  let name = text.toLowerCase().replace(/[^\w]+/g, "-");
  return `
      <h${level} class="${fig} heading-${level}" >
        <a name="${name}" class="${fig} heading anchor">${text}</a>
      </h${level}>`;
};

const code = function (code, infostring, escaped) {
  let list = code.split('\n');
  let inner = '';
  for(let line of list){
    inner = inner + codeBlock(line);
  }
  return `
    <pre class="${fig} code--pre">
      ${inner}
    </pre>
  `
};

function list (body, ordered, start) {
  return `<ol class="${fig} list" data-start="${start}">${body}</ol>`;
};

function listitem(text, task, checked) {
  return `<li class="${fig} list--item" data-task="${task}">${text}</li>`;
};

function image(href, title, text) {
  return `<img class="${fig} image" src="${href}" alt="${text}" title="${title}"></img>`;
};

function paragraph(text) {
  return `<p class="${fig} paragraph">${text}</p>`;
};

function table(header, body) {
  return `<table class="${fig} table">${header}${body}</table>`;
};

function tablerow(content, flags) {
  return `<tr class="${fig} row">${content}</tr>`;
};

function tablecell(content, flags) {
  let dataset = '';
  for(let k in flags){
    if(flags[k]) dataset = `${dataset} data-${k}="${flags[k]}"`;
  }
  return `<td ${dataset} class="${fig} cell ">${content}</td>`;
};

module.exports = {
  heading,
  list,
  image,
  listitem,
  paragraph,
  code,
  table,
  tablerow,
  tablecell
};
