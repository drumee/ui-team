class __leaflet extends Marionette.View {
  constructor(...args) {
    super(...args);
    this.onRender = this.onRender.bind(this);
    this._createLines = this._createLines.bind(this);
    this._onMapClick = this._onMapClick.bind(this);
    this._display = this._display.bind(this);
    this.onDomRefresh = this.onDomRefresh.bind(this);
  }

  static initClass() {
    this.prototype.templateName = _T.wrapper.raw;
    this.prototype.className = "leaflet marggin-auto";
    behaviorSet({
      bhv_spin : _K.char.empty,
      bhv_renderer : _K.char.empty
    });
  }
// ========================
//
// ========================

// ===========================================================
// initialize
//
// @param [Object] opt
//
// ===========================================================
  initialize(opt) {
    if ((this.model == null)) {
      return this.model = new Backbone.Model();
    }
  }
  // ============================================
  //
  // ============================================

// ===========================================================
// onRender
//
// ===========================================================
  onRender(){
    this._map_id = _.uniqueId('map-');
    return this.$el.attr(_a.id, this._map_id);
  }
  // ============================================
  //
  // ============================================

// ===========================================================
// _createLines
//
// @param [Object] args
//
// ===========================================================
  _createLines(args){
    const opt = {
      style: {
        "color": "#ff7800",
        "weight": 5,
        "opacity": 0.65
      },

// ===========================================================
// onEachFeature
//
// @param [Object] feature
// @param [Object] layer
//
// ===========================================================
      onEachFeature(feature, layer) {
        return layer.bindPopup(feature.properties.popupContent);
      }
    };
    const data = {
      "type": "Feature",
      "properties": {
          "name": "Coors Field",
          "amenity": "Baseball Stadium",
          "popupContent": "Route !!!!"
        },
      "geometry": {
        "type": "LineString",
        "coordinates": [[2.13, 48.58], [4.31, 48.07], [4.91, 47.65]]
      }
    };
    return L.geoJson(data, opt).addTo(this._map);
  }
  // ============================================
  //
  // ============================================

// ===========================================================
// _onMapClick
//
// @param [Object] args
//
// ===========================================================
  _onMapClick(args){
    const {
      lng
    } = args.latlng;
    const {
      lat
    } = args.latlng;
    _dbg("getCenter", lng, args.latlng);
    const geojsonMarkerOptions = {
      radius: 8,
      fillColor: "#ff78a0",
      color: "#000",
      weight: 1,
      opacity: 0.6,
      fillOpacity: 0.8,
      title : "ODEBU"
    };
    const opt = {

// ===========================================================
// pointToLayer
//
// @param [Object] feature
// @param [Object] latlng
//
// @return [Object] 
//
// ===========================================================
      pointToLayer(feature, latlng) {
        return L.circleMarker(latlng, geojsonMarkerOptions);
      },

// ===========================================================
// onEachFeature
//
// @param [Object] feature
// @param [Object] layer
//
// ===========================================================
      onEachFeature(feature, layer) {
        return layer.bindPopup(feature.properties.popupContent);
      }
    };
    const geojsonFeature = {
      "type": "Feature",
      "properties": {
          "name": "Coors Field",
          "amenity": "Baseball Stadium",
          "popupContent": "This is where the Rockies play!"
        },
      "geometry": {
          "type": "Point",
          "coordinates": [lng, lat]
        }
    };
    L.geoJson(geojsonFeature, opt).addTo(this._map);
    return this._createLines();
  }
  // ============================================
  //
  // ============================================

// ===========================================================
// _display
//
// ===========================================================
  _display(){
    L.Icon.Default.imagePath = '/dev/-/static/-/images/leaflet';
    this.map = L.map(this._map_id);
    this.map.setView([48.505, 5.44], 7);
    this.triggerMethod(_e.spinner.stop);
    this.trigger(_e.ready);
    const opt = {
      attribution: 'Map data © <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
      maxZoom: 18,
      id: 'mapbox.light',
      accessToken: 'pk.eyJ1IjoieGlhbGlhIiwiYSI6ImNpc2FmaHJhdDAwMXMyeHB2bHR3MThvczQifQ.Lo_AXcegStJonetox3pakA'
    };
    return L.tileLayer(`${protocol}://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}`, opt).addTo(this.map);
  }
  // ============================================
  //
  // ============================================

// ===========================================================
// onDomRefresh
//
// ===========================================================
  onDomRefresh(){
    const h = this.$el.parent().height() || $(window).height();
    const w = this.$el.parent().width() || $(window).width();
    //_dbg ">>>HHH", h, w, @
    this.$el.innerHeight(h);
    this.$el.innerWidth(w);
    return require.ensure(['application'], ()=> {
      this._leaflet = require('leaflet');
      //require('node_modules/leaflet/dist/leaflet.css')
      return this._display();
    });
  }
}
__leaflet.initClass();
module.exports = __leaflet;
// xialia =
// private : sk.eyJ1IjoieGlhbGlhIiwiYSI6ImNpc2FoZ2EybzAwMjcydG16bnpjbnR0dGQifQ.TC8PJ9fu2LAhf6ku2frVgg
// public :
