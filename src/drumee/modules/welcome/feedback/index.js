/* ==================================================================== *
*   Copyright Xialia.com  2011-2020
*   FILE : /src/drumee/modules/welcome/reset/index.js
*   TYPE : Component
* ==================================================================== */
/// <reference path="../../../../../@types/index.d.ts" />

const __welcome_interact = require('../interact');

/**
 * Class representing reset page in Welcome module.
 * @class ___welcome_feedback
 * @extends __welcome_interact
 */

class __welcome_feedback extends __welcome_interact {

  /**
   ** @param {object} opt
  */
  initialize(opt = {}) {
    // @ts-ignore
    require('./skin');
    super.initialize(opt);
    this._secret = this.mget(_a.secret)
    this._type = '';
    this._method = {};
    this.declareHandlers();
  }

  /**
   *
  */
  onDomRefresh() {
    // Get locale words not existing in default lexicon (LOCALE)
    this.fetchService({
      service : SERVICE.locale.group,
      name    : '_account'
    }).then((data)=>{
      // These rows carry one column per language. This used to index them
      // with the raw Visitor.language() — whose fallback was
      // navigator.language — and wrote the result into the SHARED LOCALE
      // safe-object, so a French-configured browser injected French values
      // for every _account key into an English session (they stayed there
      // for every widget rendered afterwards). Resolve the column with a
      // whitelist and an English default, and fall back to the English
      // column when the chosen one is empty.
      let key = Visitor.language();
      if (!/^(en|fr|es|ru|km|zh)$/.test(key)) key = 'en';
      for(let row of data){
        LOCALE[row.key_code] = row[key] || row.en;
      }
      this.feed(require('./skeleton').default(this));
    })

  }


  
  /**
   * @param {LetcBox} cmd
   * @param {any} args
  */
  onUiEvent(cmd, args) {
    const service = args.service || cmd.get(_a.service) || cmd.get(_a.name);

    switch (service) {
      case _e.submit: 
        return this.submit();
      
      
      default: 
        return this.debug(`${service} not found.`)
    }
  }

  /**
   *
  */
  submit () {
    let msg = this.__refTextarea.getValue();
    this.__refTextarea.el.dataset.error = 0;
    if(_.isEmpty(msg)){
      this.__refTextarea.el.dataset.error = 1;
      return;
    }
    this.postService({
      service : SERVICE.support.leave_comment,
      message   : this.__refTextarea.getValue()
    }).then(()=>{
      this.__btnAction.set({content: LOCALE.THANK_YOU}); //'Merci!'
      _.delay(()=>{location.hash="#"}, 1500);//1000
    });
  }
  

  /**
   * @param {object} data
  */
  responseRouter(data) {
    this.data = data;
    this._type = data.method;
    this._method = data.metadata.step;
    return this.route()
  }


}


module.exports = __welcome_feedback;
