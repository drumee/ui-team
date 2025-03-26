/* ==================================================================== *
*   Copyright Xialia.com  2011-2020
*   FILE : /home/somanos/devel/ui/letc/template/index.coffee
*   TYPE : Component
* ==================================================================== */

//#########################################

class ___status_pill extends LetcBox{

  /* ===========================================================
   *
   * ===========================================================*/
  initialize (opt={}){
    require('./skin');
    super.initialize(opt);
    this.skeleton = require('./skeleton')(this);
  }

}

module.exports = ___status_pill