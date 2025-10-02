
const __butler = require(".");
class __router_cop extends __butler {


  /**
   * 
   */
  async restart(reload = 0) {
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
    Visitor.set({ connection: _a.off });
    this.isDisconnecting = 1;
    this.feed([Skeletons.Note({
      className: `${this.fig.family}-goodbye__disconnecting`,
      content: LOCALE.GOODBYE_LOGOUT.format(Visitor.profile().firstname)
    }), { kind: 'spinner' }]);
    this.postService({
      service: SERVICE.drumate.logout,
      hub_id: Visitor.id
    }, { async: 1 }).then((data) => {
      setTimeout(() => {
        this.restart(1);
      }, 200);
    }).catch((e) => {
      this.warn("Normal logout has failed. Proceeding to reset session", e);
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
