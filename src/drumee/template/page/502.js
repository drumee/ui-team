module.exports = function (env, error, style) {
  const { endpoint } = bootstrap();
  let html = `
    <div>Ooops !</div> 
    <div>Something wrong happen to our servers.</div> 
    <div>Please try again later</div> 
    <a ${style} href="${endpoint}/#/welcome">Reload</a>
  `;
  return html;
};