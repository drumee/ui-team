module.exports = function (env, error, style) {
  const { endpoint } = bootstrap();
  let html = `
    <div>Oups&nbsp;!</div>
    <div>Un problème est survenu sur nos serveurs.</div>
    <div>Veuillez réessayer plus tard</div>
    <a style="${style}" href="${endpoint}/#/welcome">${LOCALE.GOTO_HOMEPAGE}</a>
  `;
  return html;
};
