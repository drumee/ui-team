// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : src/drumee/builtins/sandbox/ui
//   TYPE :
// ==================================================================== *


const __window_analytics = require('..');
/**
 * @class __window_search
 * @extends __window_interact
 */

class __window_analytics_extractor extends __window_analytics {

  /**
   * 
   * @param {*} opt 
   * @returns 
   */
  initialize(opt) {
    require('./skin');
    super.initialize(opt);
    let {title} = this.mget(_a.vars);
    this.mset({title : title || "Drumee Transfer Analytics"});
    this.media = opt.trigger;
    this.mset(this.media.actualNode());

  }

  /**
   * 
   */
  onPartReady(child, pn) {
    switch (pn) {
      case _a.content:
        //this._content = child;
        child.feed(require('./skeleton/content')(this));
        this.raise();
        break;
      default:
        super.onPartReady(child, pn);
    }
  }

  // ===========================================================
  //
  // ===========================================================
  clearMessage() {
    this.getPart('error-message-wrapper').el.dataset.state = _a.closed
    this.getPart('error-message').set({ content: '' })
    this.getPart('go-button-wrapper').el.dataset.state = _a.open
  }

  // ===========================================================
  //
  // ===========================================================
  showErrorMessage(msg) {
    this.getPart('go-button-wrapper').el.dataset.state = _a.closed
    this.getPart('error-message-wrapper').el.dataset.state = _a.open
    this.getPart('error-message').set({ content: msg })
    _.delay(this.clearMessage.bind(this), Visitor.timeout(2500))
    return;
  }

  /**
   * 
   */
   download(){
    let origURL = this.actualNode(_a.slide).url; 
    this.fetchFile({
      url : origURL,
    }).then(blob => {
      const url = URL.createObjectURL(blob);
      this.debug("preLoad:483", url);
    })
  }
  

  // ===========================================================
  //
  // ===========================================================
  async submit() {
    let { start, end, domains } = this.getData(_a.formItem);
    let parse = (date, name)=>{
      date = date.trim();
      let rex = /^[0-9]{2}.+[0-9]{2}.+[0-9]{2,4}$/;
      let entry = this.getPart(`entry-${name}`);

      if (!rex.test(date)) {
        entry && entry.showError();
        return null
      }
      let [dd, mm, yy] = date.split(/[\/\- ]+/);
      dd = parseInt(dd);
      mm = parseInt(mm);
      if(mm > 12 || yy < 1970 || dd > 31 || mm == 0 || dd == 0){
        if (!rex.test(date)) {
          entry && entry.showError();
          return null
        }  
      }
      if(yy >= 2000){
        yy = yy - 2000;
      }
      if(yy >= 1000){
        yy = yy - 1000;
      }
      return {dd, mm, yy}
    }
    let date = {
      start : parse(start, _a.start),
      end : parse(end, _a.end)
    }
    if(!date.start && ! date.end){
      this.showErrorMessage("Date invalide");
      return
    }

    date.start = date.start || date.end;
    let vars = this.mget(_a.vars) || {};
    let view = this.mget(_a.view) || {};
    if(domains){
      let dom = domains.split(/[ ,;]+/);
      vars.params = vars.params || {};
      vars.params.domains = [];
      if(dom.length){
        for(var d of dom){
          if(!_.isEmpty(d)){
            view[d] = d;
            vars.params.domains.push(d);
          }
        }
      }
    }
    let api = this.mget(_a.api);

    this.postService(api, {
      nid : this.mget(_a.nid),
      hub_id : this.mget(_a.hub_id),
      vars,
      view,
      date,
    }, {async:1}).then((data)=>{
      let p = Wm.getItemsByAttr(_a.nid, data.pid)[0];
      p && p.addMedia && p.addMedia(data);
      this.goodbye();
    }).catch((e)=>{
      this.warn("Failed to extrac", e);
      let msg = e.error || e.toString();
      Wm.alert(`Ooops! (${msg})`);
    })
    //this.debug("AAA:46", date);
  }

  // >>===========================================================
  // 
  // >>===========================================================
  onUiEvent(cmd, args) {
    let service = cmd.get(_a.service) || cmd.get(_a.status);
    const status = cmd.get(_a.status);
    this.debug("onUiEvent", service, status, this)
    switch (service) {
      case _e.submit:
        this.submit();
        break;
      default:
        super.onUiEvent(cmd, args);
    }

    return cmd = null;
  }

  /**
   * 
   */
  onDomRefresh() {
    this.feed(require('../skeleton')(this));
  }

}
module.exports = __window_analytics_extractor;