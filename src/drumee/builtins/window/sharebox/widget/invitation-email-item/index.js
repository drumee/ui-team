/* ==================================================================== *
*   Copyright Xialia.com  2011-2020
*   FILE : /src/drumee/builtins/window/adminpanel/widget/members-list-item/index.js
*   TYPE : Component
* ==================================================================== */

//#########################################

class ___widget_invitation_email_item extends LetcBox {


  /* ===========================================================
   *
   * ===========================================================*/
  initialize (opt={}){
    // @ts-ignore
    require('./skin');
    super.initialize(opt);
    this.selectedemail = this.mget('emails') || []
    this.declareHandlers();
    this.mset('formItem','emails');
    this.mode = this.mget(_a.mode)
    // this.mset('key','emails');
  }

  /* ===========================================================
   *
   * ===========================================================*/
  onPartReady (child, pn){
    switch(pn){
      case _a.none:
        this.debug("Created by kind builder", child);
        break;
      
      default:
        this.debug("Created by kind builder");
    }
  }

  /* ===========================================================
   *
   * ===========================================================*/
  onDomRefresh(){
    this.feed(require('./skeleton').default(this));
    return
  }

  /* ===========================================================
   *
   * ===========================================================*/
  onUiEvent (cmd, args = {}) {
    const service = args.service || cmd.get(_a.service) || cmd.get(_a.name);
    this.debug(`onUiEvent service=${service}`, cmd, this);

    switch(service) {
      case _a.none:
        // this.goodbye()
        this.debug('none')
      default:
        this.source = cmd;
        this.service = service;
        this.triggerHandlers();
        this.service = '';
    }
  }


  getData(){
    return {
      name: 'emails',
      value : this.mget('email')
    }
  }
 
}

___widget_invitation_email_item.initClass();

module.exports = ___widget_invitation_email_item
