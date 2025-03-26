/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : src/drumee/test
//   TYPE :
// ==================================================================== *

// EXPORTED
// -----------------------------------------------------
const __test_snippet = {

  run(opt){
    return uiRouter.getPart(_PN.preview).feed({
      kind     : KIND.snippet,
      styleOpt : {
        height : 180,
        width  : "100%"
      },
      link     : {
        rel         : "stylesheet", 
        href        : "https://unpkg.com/leaflet@1.3.4/dist/leaflet.css",
        integrity   : "sha512-puBpdR0798OZvTTbP4A8Ix/l+A4dHDD0DGqYW6RQ+9jxkRFclaxxQb/SJAWZfWAkuyeQUytO7+7N4QKrDh+drA==",
        crossorigin : ""
      },
      script   : {
        src         : "https://unpkg.com/leaflet@1.3.4/dist/leaflet.js",
        integrity   : "sha512-nMMmRyTVoLYqjP9hrbed9S+FzjZHW5gY1TWCHA5ckwXZBadntCNs8kEqAWdrb9O7rxbCaA4lKTIWjDXZxflOcA==",
        crossorigin : ""
      }
    });
  }
};
        
module.exports = __test_snippet;
