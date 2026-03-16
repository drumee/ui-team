

module.exports = function (ui) {
  const url = ui.mget(_a.src) || ui.mget(_a.url) || ui.mget(_a.source);
  const id = `embeded-${ui._id}`;
  return `
    <iframe class="fill-up ${ui.fig.family}" id="${id}" src="${url}" width="100%" height="100%" frameborder="${ui.mget(_a.border)}" ${ui.mget(_a.option)} name="${id}"></iframe>
  `;
};
