// ==================================================================== *
//   Copyright Xialia.com  2011-2021
//   FILE : /ui/src/drumee/builtins/widget/chat-item/index.coffee
//   TYPE : Component
// ==================================================================== *

const ___widget_parent = require('.');

class ___widget_chatItem extends ___widget_parent {


  /**
   * 
   * @param {*} e 
   */
  async isInternalLink(e) {
    if (super.isInternalLink(e)) return true;
    //this.debug("AAAA:18",  e.target.tagName, e);
    if(e.target && /^A$/i.test(e.target.tagName)){
      e.preventDefault();
      let opt = { href: e.target.innerText };
      await Minishell.exec('open.link', opt);
      return false;
    } 
    this.debug("AAAA:20", e.target.tagName, e);
    return true
  }

}


module.exports = ___widget_chatItem;