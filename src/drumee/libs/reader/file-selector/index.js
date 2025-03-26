class __file_selector extends Marionette.View {

  /**
   * 
   */
  onDomRefresh() {
    this.el.innerHTML = require('./template')(this);
  }

  /**
   * 
   * @param {*} cb 
   * @returns 
   */
  bindChange(cb) {
    return this._callback = cb;
  }

  /**
   * 
   * @param {*} handler 
   * @returns 
   */
  open(handler) {
    let el = document.getElementById(`${this._id}-fsel`);
    el.onchange = (e)=>{
      handler(e);
      el.onchange = null;
    };
    if(!el){
      reject("No element to handle file selection");
      return;
    }
    el.value = '';
    el.click();
  }
}
    
module.exports = __file_selector;
