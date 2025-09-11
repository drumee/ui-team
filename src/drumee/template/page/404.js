module.exports = function (env, error, style) {
  const { protocol, main_domain } = bootstrap();
  let html = `
    <div>Ooops... ${LOCALE.SITE_NOT_FOUND.format(location.host)}</div> 
    <a style="${style}" href="${protocol}://${main_domain}/#/welcome">${LOCALE.GOTO_HOMEPAGE}</a>
  `;
  return html;
};
