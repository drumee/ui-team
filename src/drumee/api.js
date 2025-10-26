/**
 * @license
 * Copyright 2025 Thidima SA. All Rights Reserved.
 * Licensed under the GNU AFFERO GENERAL PUBLIC LICENSE, Version 3 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://www.gnu.org/licenses/agpl-3.0.html
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
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
