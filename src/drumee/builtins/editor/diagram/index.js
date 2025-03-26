const __player = require("player/interact");

class __editor_diagram extends __player {
  /**
   *
   */
  initialize(opt = {}) {
    require("./skin");
    super.initialize(opt);
    this.size.with = window.innerWidth - 100;
    this.style.set({ width: this.size.with });
  }

  /**
   * 
   */
  display(){
    this.size = this.max_size();
    super.display(this.size);
  }

  /**
   *
   * @param {View} child
   * @param {String} pn
   */
  onPartReady(child, pn) {
    switch (pn) {
      case _a.content:
        this.display({ top: 85 });
        this.setupInteract();
        this.raise();
        let media = this.media;
        let kind = 'diagram_state';
        Kind.waitFor(kind).then(()=>{
          child.feed({ kind, media });
          this._diagram = child.children.last();  
        })

        break;
      default:
        super.onPartReady(child, pn);
    }
  }


  //window.addEventListener('DOMContentLoaded', init);

  /**
   * Upon DOM refresh, after element actually insterted into DOM
   */
  onDomRefresh() {
    this.debug("AAAXX:38 -- onDomRefresh", this);
    this.feed(require("./skeleton")(this));
  }

  /**
   * User Interaction Evant Handler
   * @param {View} cmd
   * @param {Object} args
   */
  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.get(_a.service);
    switch (service) {
      case _e.save:
        this._diagram.save();
        break;
      case _e.load:
        this.debug("AAA:56 -- onUiEvent", location);
        break;
      default:
        this.debug("AAA:59 -- onUiEvent");
        if (super.onUiEvent) super.onUiEvent(cmd, args);
    }
  }

  /**
   *
   * @param {Object} xhr
   * @param {Model} socket
   */
  on_rest_error(xhr, socket) {
    this.warn(`EEE:70 GOT SERVER ERROR :`, xhr);
  }


}

export default __editor_diagram;
