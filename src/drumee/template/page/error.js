module.exports = function (env, error, style) {
  const { endpoint } = bootstrap();
  let html = `
    <div>Ooops !</div> 
    <div>${location.host} could not be found.</div> 
    <a style="${style}" href="${endpoint}/#/welcome">${LOCALE.GOTO_HOMEPAGE}</a>
  `;
  return html;
};