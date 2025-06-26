
function __kind_loader(promise){
  class ___letc_loader extends LetcBox {

    static initClass() {
      this.prototype.isLazyClass  = 1;
    }

    /**
     * 
     */
    onBeforeRender(){
      const k = this.mget(_a.kind);
      const ok = f=> {
        Kind.register(k, f, 0);
        let index =  this.renew();
        this.trigger(_a.respawn, index);
      };
      const failed = e=> {
        this.warn("FAILED TO RESPAWN ", this , "->", promise);
        return this.warn("RESPAWN STACK :::: ", e); 
      };

      promise.then(ok).catch(failed);
    }
  }
  ___letc_loader.initClass();

  return ___letc_loader;
};
export default __kind_loader;