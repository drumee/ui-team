class __leaflet extends Letc.snippet {

  onStart() {
    let polygon;
    this.debug("STARTINGonStart");
    const mymap = L.map(this._id).setView([51.505, -0.09], 13);
    L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw', {
		  maxZoom: 18,
		  attribution: `Map data &copy; <a href=`${protocol}://www.openstreetmap.org/`>OpenStreetMap</a> contributors, \
<a href=`${protocol}://creativecommons.org/licenses/by-sa/2.0/`>CC-BY-SA</a>, \
Imagery © <a href=`${protocol}://www.mapbox.com/`>Mapbox</a>`,
		  id: 'mapbox.streets'
    }).addTo(mymap);

    const marker = L.marker([51.5, -0.09]).addTo(mymap);
    const circle = L.circle([51.508, -0.11], {
      color: 'red',
      fillColor: '#f03',
      fillOpacity: 0.5,
      radius: 500
    }).addTo(mymap);
    return polygon = L.polygon([
      [51.509, -0.08],
      [51.503, -0.06],
      [51.51, -0.047]
    ]).addTo(mymap);
  }
}

// EXPORTED
// -----------------------------------------------------
const __test_leaflet = {

  run(opt){
    ({
      creator: { 
        styleOpt : {
          left   : (window.innerWidth/2)  - 300,
          top    : (window.innerHeight/2) - 300,
          height : 600,
          width  : 600
        },
        link     : {
          rel         : "stylesheet", 
          href        : `${protocol}://unpkg.com/leaflet@1.3.4/dist/leaflet.css`,
          integrity   : "sha512-puBpdR0798OZvTTbP4A8Ix/l+A4dHDD0DGqYW6RQ+9jxkRFclaxxQb/SJAWZfWAkuyeQUytO7+7N4QKrDh+drA==",
          crossorigin : ""
        },
        script   : {
          src         : `${protocol}://unpkg.com/leaflet@1.3.4/dist/leaflet.js`,
          integrity   : "sha512-nMMmRyTVoLYqjP9hrbed9S+FzjZHW5gY1TWCHA5ckwXZBadntCNs8kEqAWdrb9O7rxbCaA4lKTIWjDXZxflOcA==",
          crossorigin : ""
        }
      }
    });
    return uiRouter.getPart(_PN.preview).carry(__leaflet, opt);
  }
};
        
module.exports = __test_leaflet;
