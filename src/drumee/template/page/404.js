module.exports = function (env, error, style) {
  const { endpoint } = bootstrap();
  let html = `
    <div>Ooops... ${LOCALE.SITE_NOT_FOUND.format(location.host)}</div> 
    <a style="${style}" href="${endpoint}/#/welcome">${LOCALE.GOTO_HOMEPAGE}</a>
  `;
  return html;
};
