// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : builtins/sandbox/skeleton/leaflet
//   TYPE :
// ==================================================================== *



// EXPORTED
// -----------------------------------------------------
const __sandbox_leaflet_wrapper = function(manager){
  let tips = { 
    kind: KIND.note,
    className : "item-tips",
    content: "Host your own snippets on third party infrastructure, or your own one..."
  };

  tips = SKL_Box_H(manager, {
    className: "sandbox--radio",
    kids: [tips]
  });
  const ll = { 
    styleOpt : {
      left   : 0,
      top    : 0,
      height : window.innerHeight - 100,
      width  : "100%"
    },
    vendors  :[{
      link     : {
        rel         : "stylesheet", 
        href        : "https://unpkg.com/leaflet@1.3.4/dist/leaflet.css",
        integrity   : "sha512-puBpdR0798OZvTTbP4A8Ix/l+A4dHDD0DGqYW6RQ+9jxkRFclaxxQb/SJAWZfWAkuyeQUytO7+7N4QKrDh+drA==",
        crossorigin : "true"
      }
    },{
      script   : {
        src         : "https://unpkg.com/leaflet@1.3.4/dist/leaflet.js",
        integrity   : "sha512-nMMmRyTVoLYqjP9hrbed9S+FzjZHW5gY1TWCHA5ckwXZBadntCNs8kEqAWdrb9O7rxbCaA4lKTIWjDXZxflOcA==",
        crossorigin : "true"
      }
    }],
    snippets  :[{
      script   : {
        src         : "https://gist.github.com/somanos/c48496294125862f54220887c3c87fc6/raw/06543367aca4b2d4c445a7e15b7cb96a7ad72991/letc-snippet.js",
        crossorigin : "true"
      }
    }]
  };
  const a = SKL_Box_V(manager, {
    kids: [tips, ll]
  });
  return a;
};
module.exports = __sandbox_leaflet_wrapper;
