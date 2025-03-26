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
      this.debug("EZEZZEZEZE", data);
      for(let row of data){
        let key = Visitor.language();
        LOCALE[row.key_code]= row[key];  
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
    this.debug(`onUiEvent service = ${service}`, cmd, this);

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
