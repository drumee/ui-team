const { timestamp } = require("core/utils")

//########################################
class socket_pipe extends WPP.Socket {
// ========================
//
// ========================

// ===========================================================
// url
//
// @return [Object] 
//
// ===========================================================
  constructor(...args) {
    this._makeData = this._makeData.bind(this);
    this.slurp = this.slurp.bind(this);
    super(...args);
  }

  url() {
    return this._url || '?';
  }
// ========================
// initialize
// ========================

// ===========================================================
// initialize
//
// @param [Object] opt
//
// ===========================================================
  initialize(opt) {
    return super.initialize();
  }
    //@params  = Host.get(_a.cache)
// ========================
// _makeData
// ========================

// ===========================================================
// _makeData
//
// @return [Object] 
//
// ===========================================================
  _makeData() {
    const data = this.toJSON();
    const service = data.service || data.api || _a.local;
    if (_.isString(data.api)) {
      delete data.api;
      delete data.m;
    }
    //data.service  = service
    if (service === _a.local) {
      data.service = service;
    }
    data.lang      = Visitor.language();
    data.pagelang  = Visitor.pagelang();
    data.device    = Visitor.device();
    //@clear()
    this.set(data);
    return data;
  }
// ========================
// validate
// ========================

// ===========================================================
// validate
//
// @param [Object] args
//
// @return [Object] 
//
// ===========================================================
  validate(args) {
    //@debug ">>==========> TTTT validate", args
    if ((this.get(_a.service) == null)) {
      this.warn("NO API");
      return "no api";
    }
    return null;
  }
// ========================
// slurp
// Issue a "GET http*://..." request
// ========================

// # ===========================================================
// # slurp
// #
// # @param [Object] filename
// #
// # ===========================================================
//   slurp: (filename) =>
//     @debug ">>==========> QQQ slurp", filename
//     @_url = filename
//     options = @_makeOptions()
//     options.data = {}
//     if @params? and not @params.cache
//       options.data.nocache = timestamp()
//     options.data.lang = Env.get(_a.lang) || localStorage.lang
//     options.data.device = Env.get(_a.device) || localStorage.device
//     @fetch(options)
//     $.when(@_defer).done @__dispatchRest

// ===========================================================
// slurp
//
// @param [Object] filename
//
// ===========================================================
  slurp(filename) {
    this._url = filename;
    const options = this._makeOptions();
    options.data = {};
    if (localStorage.no_cache || ((this.params != null) && !this.params.cache)) {
      options.data.nocache = timestamp();
    }
    //if @useXParams
    // options.data.lang = Env.get(_a.lang) || localStorage.lang
    // options.data.device = Env.get(_a.device) || localStorage.device
    options.data.lang      = Visitor.language();
    options.data.pagelang  = Visitor.pagelang();
    options.data.device    = Visitor.device();
    //@debug ">>==========> QQQ slurp",  options, filename, @
    this.fetch(options);
    return $.when(this._defer).done(this.__dispatchRest);
  }
}
    
module.exports = socket_pipe;
