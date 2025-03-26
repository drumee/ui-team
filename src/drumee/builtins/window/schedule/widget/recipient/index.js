/* ==================================================================== *
*   Copyright Xialia.com  2011-2020
*   FILE : /home/somanos/devel/ui/letc/template/index.coffee
*   TYPE : Component
* ==================================================================== */

//#########################################

class __schedule_recipient extends LetcBox{


  /* ===========================================================
   *
   * ===========================================================*/
  initialize (opt={}){
    require('./skin');
    super.initialize(opt);
    this.declareHandlers();
    //this.skeleton = require('./skeleton')(this);
  }

  /**
   * 
   */
  displayName(){
    if(!_.isEmpty(this.mget(_a.surname))) return this.mget(_a.surname);
    let first = this.mget(_a.firstname) || '';
    let last  = this.mget(_a.lastname) || '';
    if(_.isEmpty(first)){
      return last;
    }
    if(_.isEmpty(last)){
      return firs;
    }
    return `${first} ${last}`;
  }


  /* ===========================================================
   *
   * ===========================================================*/
  onDomRefresh(){
    this.feed(require('./skeleton')(this));
  }

  /* ===========================================================
   *
   * ===========================================================*/
  onUiEvent (cmd, args){
    let service = cmd.get(_a.service) || cmd.get(_a.name);

    switch(service){
      case  _a.delete:
        this.suppress();
        this.source = this
        this.service = service
        this.triggerHandlers()
        return
      default:
        this.debug("Created by kind builder");
        this.source = this
        this.service = service
        this.triggerHandlers()
        //super.onUiEvent(cmd, args)
    }
  }

}

module.exports = __schedule_recipient
