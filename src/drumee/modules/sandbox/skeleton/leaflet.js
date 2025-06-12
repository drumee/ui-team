// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : builtins/sandbox/skeleton/leaflet
//   TYPE :
// ==================================================================== *



// EXPORTED
// -----------------------------------------------------
const __sandbox_leaflet_wrapper = function(_ui_, nid){
  let tips = { 
    kind: KIND.note,
    className : "item-tips",
    content: "Read tips above."
  };

  tips = SKL_Box_H(_ui_, {
    className: "sandbox--radio",
    kids: [tips]
  });
  nid = nid || "5bda11f97ed20ec8";
  const ll = { 
    styleOpt : {
      left   : 0,
      top    : 0,
      height : window.innerHeight - 100,
      width  : "100%"
    },
    kind     : KIND.snippet,
    src      : `${protocol}://letc.io/file/orig/${nid}/edb90e08edb90e0c`,
    vendors  :[{
      link     : {
        rel         : "stylesheet", 
        href        : `${protocol}://unpkg.com/leaflet@1.7.1/dist/leaflet.css`,
        integrity   : "sha512-xodZBNTC5n17Xt2atTPuE1HxjVMSvLVW9ocqUKLsCC5CXdbqCmblAshOMAS6/keqq/sMZMZ19scR4PsZChSR7A==",
        crossorigin : ""
      }
    },{
      script   : {
        src         : `${protocol}://unpkg.com/leaflet@1.7.1/dist/leaflet.css`,
        integrity   : "sha512-XQoYMqMTK8LvdxXYG3nZ448hOEQiglfqkJs1NOQV44cWnUrBc8PkAOcXy20w0vlaXaVUearIOBhiXZ5V3ynxwA==",
        crossorigin : ""
      }
    }]
  };
  const a = Skeletons.Box.Y({
    kids: [tips, ll]});
  return a;
};
module.exports = __sandbox_leaflet_wrapper;
