

module.exports = function (ui) {
  const url = ui.mget(_a.src) || ui.mget(_a.url) || ui.mget(_a.source);
  return `
    <iframe class="fill-up ${ui.fig.family}" id="${ui._id}" src="${url}" width="100%" height="100%" frameborder="${ui.mget(_a.border)}" ${ui.mget(_a.option)} name="embeded-${ui._id}"></iframe>
  `;
};
