// ============================================================ *
//   Copyright Xialia.com  2011-2019
//   FILE : src/drumee/core/backbone/view
//   TYPE :
// ============================================================ *


const { makeHeaders } = require("./utils")
/**
 * General purpose net request
 * @param {*} url 
 * @param {*} opt 
 * @returns 
 */
export function xhRequest(url, opt = {}) {
  if(/^(\w+\..+)/.test(url)){
    let { svc } = bootstrap();
    url = `${svc}${url}`
  }
  let { responseType } = opt;
  if(responseType){
    delete opt.responseType
  }else{
    responseType = "json";
  }
  
  return new Promise(function (resolve, reject) {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    makeHeaders(opt, xhr);

    xhr.onreadystatechange = function (e) {
      if (xhr.readyState !== XMLHttpRequest.DONE) return;

      if (xhr.status === 200) {
        switch (responseType) {
          case "json":
            try {
              return resolve({
                ...JSON.parse(xhr.responseText),
                __status: xhr.status,
              });
            } catch (e) {
              console.warn(`Failed to parse respose`, e);
              return reject(xhr);
            }
          case _a.text:
            return resolve(xhr.responseText);
          default:
            return resolve(xhr);
        }
      }
      if (responseType == "json") {
        try {
          return resolve({
            response: JSON.parse(xhr.responseText),
            reason: xhr.statusText,
          });
        } catch (e) {
          console.warn(`Failed to parse respose`, e);
          return reject(xhr);
        }
      }
      reject(xhr);
    };

    xhr.onerror = function (e) {
      reject(xhr);
    };
    try {
      xhr.send();
    } catch (e) {
      reject(e);
    }
  });
}
