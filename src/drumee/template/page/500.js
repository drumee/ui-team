module.exports = function (env, error, style) {
  const { endpoint }= bootstrap();
  let html = `
    <div>Ooops !</div> 
    <div>Something wrong happen to the servers.</div> 
    <div>Please try again later</div> 
    <a style="${style}" href="${endpoint}/#/welcome">${LOCALE.GOTO_HOMEPAGE}</a>
  `;
  return html;
};