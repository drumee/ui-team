/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : src/drumee/test/leaflet-wrapper
//   TYPE :
// ==================================================================== *



// EXPORTED
// -----------------------------------------------------
const __test_leaflet_wrapper = {

  run(opt){
    return uiRouter.getPart(_PN.preview).feed({
      styleOpt : {
        left   : (window.innerWidth/2)  - 300,
        top    : (window.innerHeight/2) - 300,
        height : 600,
        width  : 600
      },
      creator  : `${protocol}://letc.drumee.com/file/orig/5bda11f97ed20ec8/edb90e08edb90e0c`,
      vendorOpt  :[{
        link     : {
          rel         : "stylesheet", 
          href        : `${protocol}://unpkg.com/leaflet@1.3.4/dist/leaflet.css`,
          integrity   : "sha512-puBpdR0798OZvTTbP4A8Ix/l+A4dHDD0DGqYW6RQ+9jxkRFclaxxQb/SJAWZfWAkuyeQUytO7+7N4QKrDh+drA==",
          crossorigin : ""
        }
      },{
        script   : {
          src         : `${protocol}://unpkg.com/leaflet@1.3.4/dist/leaflet.js`,
          integrity   : "sha512-nMMmRyTVoLYqjP9hrbed9S+FzjZHW5gY1TWCHA5ckwXZBadntCNs8kEqAWdrb9O7rxbCaA4lKTIWjDXZxflOcA==",
          crossorigin : ""
        }
      }]
    });
  }
};
module.exports = __test_leaflet_wrapper;
