
class __spinner_loader extends Marionette.View {

  
  /**
   * Upon DOM refresh, after element actually insterted into DOM
   */
  onDomRefresh(){
    this.spinner(1)
  }

}

module.exports = __spinner_loader