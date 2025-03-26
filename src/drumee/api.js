/*
Default
*/


const intEnv = function () {
  let main_domain = "drumee.com";
  let domain = "drumee.com";
  let endpointName = "main";
  let endpointPath = "/-/";
  let language = 'fr'
  let d = {};
  try {
    d = document.getElementById('drumee-api').dataset;
  } catch (e) {

  }
  try {
    language = document.documentElement.lang.toLowerCase().split('-')[0];
  } catch (e) {

  }
  domain = d.domain;
  endpointName = d.instance || "main";
  main_domain = domain || main_domain;
  if (endpointName != "main") {
    endpointPath = `${endpointPath}${endpointName}/`
  }

  let websocketPath = `${endpointPath}websocket/`;
  let servicePath = `${endpointPath}service/`;
  let env = {
    access: "",
    endpointPath: `${endpointPath}`,
    arch: "public-api",
    ident: "nobody",
    endpointName: `${endpointName}`,
    instance_name: `${endpointName}`,
    lang: `${language}`,
    locale_hash: null,
    main_domain: `${main_domain}`,
    mfs_base: `${endpointPath}`,
    service: `${servicePath}?`,
    serviceApi: `${servicePath}?`,
    servicePath: `${servicePath}`,
    signed_in: 0,
    svc: `${endpointPath}svc/`,
    vdo: `${endpointPath}vdo/`,
    uid: "ffffffffffffffff",
    user_domain: `${domain}`,
    websocketApi: `wss://${main_domain}${websocketPath}`,
    websocketPath,
  }
  return env;
}


$(document).ready(() => {
  window.DEBUG = {};
  window.db = {}; // offline storage api
  window.bootstrap = intEnv;
  require.ensure(['application'], () => {
    require('skin/global/index.scss')
    require('./core');
    require('./api/loader');
  });
});
