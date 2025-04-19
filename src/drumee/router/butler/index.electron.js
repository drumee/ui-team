
const __butler = require(".");
class __router_cop extends __butler {

 
  /**
   * 
   */
  async restart(reload=0) {
    this.debug("AAA:131 -- restart", reload);
    Visitor.clear();
    localStorage.setItem('signed_in', '0');
    localStorage.removeItem(_a.session);
    localStorage.removeItem(_a.auth);
    await Account.gotSignedOut();
    await uiRouter.restart();
  }

  /**
   * 
   */
  logout() {
    this.reconnect = () => { }; // Prevent reconnect to showup during logout
    this.feed([Skeletons.Note({
      className: `${this.fig.family}-goodbye__disconnecting`,
      content: LOCALE.GOODBYE_LOGOUT.format(Visitor.profile().firstname)
    }), { kind: 'spinner' }]);
    this.postService({
      service: SERVICE.drumate.logout,
      hub_id: Visitor.id
    }, { async: 1 }).then((data) => {
      location.hash = _K.module.welcome;
      setTimeout(()=>{
        this.restart(1);
      }, 1000);
    }).catch((e) => {
      this.warn("Normal logout has failed. Proceeding to reset session", e);
      //debugger;
      this.postService({
        service: SERVICE.yp.reset_session,
        hub_id: Visitor.id
      }, { async: 1 }).then((d) => {
        this.restart(d);
      }).catch((e) => {
        this.warn("ERROR 398", e);
        this.say(e)
      })
    });
  }
}

module.exports = __router_cop;
