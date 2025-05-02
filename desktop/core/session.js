/**
 * @license
 * Copyright 2024 Thidima SA. All Rights Reserved.
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
const _ = require('lodash');
const Fs = require('fs');
const { net } = require('electron');
const Path = require('path');
const Jsonfile = require('jsonfile');
let build = require("../../dist-web/index.json");

let _FILE = null;

/**
 * 
 * @param {*} data 
 * @returns 
 */
function set(data) {
  if(!_FILE){
    let dirname = Path.dirname(build.userConf);
    _FILE = Path.join(dirname, `session.json`);
  }
  let r = {};
  if(Fs.existsSync(_FILE)) r = Jsonfile.readFileSync(_FILE);
  if (data) {
    Jsonfile.writeFileSync(_FILE, {...r, ...data});
  }
  console.log("Writting session data FILE = ", _FILE);
  return Jsonfile.readFileSync(_FILE);
}

/**
 * 
 * @param {*} data 
 * @returns 
 */
 function initialize(build) {
  let dirname = Path.dirname(build.userConf);
  _FILE = Path.join(dirname, `session.json`);
  console.log("Initializinf session FILE = ", _FILE);
  if(!_FILE){
    let dirname = Path.dirname(build.userConf);
    _FILE = Path.join(dirname, `session.json`);
  }
  let r = {};
  if(!Fs.existsSync(_FILE)){
    Jsonfile.writeFileSync(_FILE, {});
  } 
}

/**
 * 
 * @returns 
 */
function get() {
  return Jsonfile.readFileSync(_FILE);  
}


/**
  * 
  * @param {*} url 
  * @param {*} opt 
  * @returns 
  */
function post(url, opt = {}, method = 'POST') {
  //console.log("AAA:34 url=", url);
  const data = JSON.stringify(opt);

  return new Promise((resolve, reject) => {
    const request = net.request({
      url,
      method,
      useSessionCookies: true
    });
    request.setHeader('x-param-xia-data', data);
    request.setHeader("x-param-session-type", 'regular');
    let res = '';
    request.on('response', (response) => {
      switch (response.statusCode) {
        case 200:
          console.log(`[OK] ${url} url=${url} `, opt);
          response.on('data', (chunk) => {
            res = `${res}${chunk}`;
          })
          response.on('end', () => {
            let json = JSON.parse(res);
            json.__headers = response.headers
            resolve(json);
          })
          break;
        case 403:
          resolve(null);
          break
        default:
          console.error(`Failed to fetch ${url} from ${url}.`, bootstrap(), response.headers);
          reject(response);
      }
      //this.debug(`HEADERS: ${JSON.stringify(response.headers)}`)
    });
    request.end();
  })
};


module.exports = { get, set, post, initialize };

