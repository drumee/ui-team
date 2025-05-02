/* ==================================================================== *
*   Copyright Xialia.com  2011-2020
*   FILE : /src/drumee/modules/welcome/invitation/index.js
*   TYPE : Component
* ==================================================================== */
/// <reference path="../../../../../@types/index.d.ts" />

const __welcome_interact = require('../interact');

/**
 * Class representing invitation page in Welcome module.
 * @class __welcome_invitation
 * @extends __welcome_interact
 */

class __welcome_invitation extends __welcome_interact {


  /**
   ** @param {object} opt
  */
  initialize(opt = {}) {
    // @ts-ignore
    require('./skin');
    super.initialize();
    this.token = opt.secret;
    this._checkInvitation();
    return this.declareHandlers();
  }

  /**
   * @param {LetcBox} child
   * @param {LetcBox} pn
  */
  onPartReady(child, pn, section) {
    switch (pn) {
      case _a.none:
        return this.debug('Created by kind builder');
      default:
        return this.debug('Created by kind builder');
    }
  }

  /**
   *
  */
  onDomRefresh() {
    return this.feed(require('./skeleton').default(this));
  }

  /**
   * @param {LetcBox} cmd
   * @param {any} args
  */
  onUiEvent(cmd) {
    const service = cmd.get(_a.service) || cmd.get(_a.name);
    this.debug(`onUiEvent service = ${service}`, cmd, this);

    switch (service) {
      case _a.none:
        return this.debug("Created by kind builder");
      default:
        return this.debug("Created by kind builder");
    }
  }


  /**
   *
  */
  _checkInvitation() {
    if (!Visitor.isOnline()) {
      this._loadSignup();
      return;
    }

    const userID = Visitor.id;
    return this.fetchService({
      service   : SERVICE.contact.invitation_status,
      token     : this.token,
      uid       : userID,
      hub_id    : userID
    });
  }


  /**
   * @param {Object} data
  */
  _inviteResponse(data) {
    const {
      status
    } = data;

    switch (status) {
      case _a.invalid:
        return this._logOutExistingUser();

      default:
        return this._loadDesk();
    }
  }

  /**
   *
  */
  _logOutExistingUser () {
    return this.postService({ 
      service : SERVICE.drumate.logout,
      hub_id  : Visitor.id
    });
  }

  /**
   *
  */
  _clearExistingUserData() {
    Visitor.clear();
    Host.clear();
    return this._loadSignup();
  }

  /**
   *
  */
  _loadSignup () {
    setTimeout(()=>{
      location.hash = `${ _K.module.signup}/${this.token}`;
    }, 300);
  }

  /**
   *
  */
  _loadDesk () {
    setTimeout(()=>{
      location.hash = _K.module.desk;
    }, 300);
  
  }

  /**
   * @param {_SVC} service
   * @param {object} data
   * @param {any} socket
  */
  __dispatchRest(service, data, socket) {
    switch (service) {
      case SERVICE.contact.invitation_status:
        return this._inviteResponse(data);
      
      case SERVICE.drumate.logout:
        return this._clearExistingUserData();
    }
  }
}


module.exports = __welcome_invitation;
