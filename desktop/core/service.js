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
const { net } = require("electron");
const { createWriteStream, mkdirSync, existsSync } = require("fs");
const { dirname } = require("path");

const { trace_service } = require("../args")

const __dialog = require("./dialog");
class __core_service extends __dialog {
  /**
   *
   */
  sendIpcMessage(msg, args) {
    webContents.send(msg, args);
  }

  /**
   *
   * @param {*} service
   * @param {*} opt
   * @returns
   */
  downloadToFile(url, dest) {
    const request = net.request({
      url,
      method: "GET",
      useSessionCookies: true,
    });
    //this.debug("DOWNLOADING ", {url, dest});
    let dir = dirname(dest);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    let loaded = 0;
    let localStream = createWriteStream(dest);;
    return new Promise((resolve, reject) => {
      request.on("response", (response) => {
        switch (response.statusCode) {
          case 200:
            //this.debug(`${url}: OK`)
            response.on("data", (chunk) => {
              loaded = loaded + chunk.length;
              try {
                localStream.write(chunk);
              } catch (e) {
                this.debug("EEE:595", e);
              }
            });
            response.on("end", () => {
              localStream.end();
              this.debug(`writing into ${dest}`);
              resolve(dest);
            });
            break;
          case 403:
            reject({ error: "permission_denied", reason: "WEAK_PRIVILEGE" });
            this.debug(`Permission denied to run ${service} from ${url}`);
            // resolve(null);
            break;
          case 400:
            reject({ error: "bad_request", reason: "SERVICE_REJECTED" });
            break;
          default:
            this.debug(`Failed to fetch ${service} from ${url}`);
            reject(response);
        }
        //this.debug(`HEADERS: ${JSON.stringify(response.headers)}`)
      });
      request.on("error", (e) => {
        if (/ERR_NETWORK_CHANGED/.test(e)) {
          let r = retry + 1;
          this.debug(e, `Retrying ${r}`);
          setTimeout(() => {
            return this.sendService(service, opt, method, r);
          }, 1000);
          return;
        }
        this.debug("AAAA:76 -- SERVICE ERROR", this.info(), e);
        reject(e);
        //this.backendError(e);
      });

      request.end();
    });
  }

  /**
   *
   * @param {*} service
   * @param {*} opt
   * @returns
   */
  sendService(service, opt = {}, method = "POST", retry = 0) {
    let url = `${Account.bootstrap().svc}${service}`;
    this.debug("AAA:23 SERVICE=", url);
    const data = JSON.stringify(opt);

    return new Promise((resolve, reject) => {
      if (retry > 3) {
        reject({ error: "ERR_SERVICE_FAILED" });
        return;
      }
      const request = net.request({
        url,
        method,
        useSessionCookies: true,
      });
      request.setHeader("x-param-xia-data", data);
      request.setHeader("x-param-keysel", "regsid");
      let res = "";
      request.on("response", (response) => {
        switch (response.statusCode) {
          case 200:
            if (trace_service){
              this.debug(`[OK] ${url} service=${service} `, opt);
            }
            response.on("data", (chunk) => {
              res = `${res}${chunk}`;
            });
            response.on("end", () => {
              try {
                let json = JSON.parse(res);
                this.__header = response.headers;
                global.CONNECTION_STATE = json.__status__;
                resolve(json.data);
              } catch (e) {
                resolve(res);
              }
            });
            break;
          case 403:
            reject({ error: "permission_denied", reason: "WEAK_PRIVILEGE" });
            this.debug(`Permission denied to run ${service} from ${url}`);
            // resolve(null);
            break;
          case 400:
            reject({ error: "bad_request", reason: "SERVICE_REJECTED" });
            break;
          default:
            this.debug(`Failed to fetch ${service} from ${url}`);
            reject(response);
        }
        //this.debug(`HEADERS: ${JSON.stringify(response.headers)}`)
      });
      request.on("error", (e) => {
        if (/ERR_NETWORK_CHANGED/.test(e)) {
          let r = retry + 1;
          this.debug(e, `Retrying ${r}`);
          setTimeout(() => {
            return this.sendService(service, opt, method, r);
          }, 1000);
          return;
        }
        this.debug("AAAA:154 -- SERVICE ERROR", this.info(), e);
        if (/ERR_INTERNET_DISCONNECTED/.test(e)) {
          webContents.send("backend:error", e);
          return;
        }
        reject(e);
        //this.backendError(e);
      });

      request.end();
    });
  }

  /**
   *
   * @param {*} service
   * @param {*} opt
   * @returns
   */
  postService(service, opt = {}) {
    return this.sendService(service, opt);
  }

  /**
   *
   * @param {*} service
   * @param {*} opt
   * @returns
   */
  fetchService(service, opt = {}) {
    return this.sendService(service, opt, "GET");
  }
}

module.exports = __core_service;
