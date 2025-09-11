module.exports = function (env, error, style) {
  const { protocol, main_domain, endpointPath } = bootstrap();
  let html = `
    <div>Ooops !</div> 
    <div>Something wrong happen to our servers.</div> 
    <div>Please try again later</div> 
    <a ${style} href="${protocol}://${main_domain}${endpointPath}/#/welcome">Reload</a>
  `;
  return html;
};