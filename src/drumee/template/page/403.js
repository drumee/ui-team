module.exports = function (env, error, style) {
  const { protocol, main_domain } = bootstrap();
  let html = `
    <div>Ooops !</div> 
    <div>You are not allow to acces this site.</div> 
    <div>This due to its settings which grants accees to only authorized members</div> 
    <a style="${style}" href="${protocol}://${main_domain}/#/welcome">${LOCALE.GOTO_HOMEPAGE}</a>
  `;
  return html;
};