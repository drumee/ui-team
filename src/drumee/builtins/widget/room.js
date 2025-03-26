class __room extends Marionette.View {

  static initClass() {
    this.prototype.templateName = _T.wrapper.raw;
    this.prototype.className = "widget utils-namespace";
  // =================== *
  // Proxied
  // =================== *
    this.prototype.behaviorSet = { 
      bhv_renderer   : {
        eval_code    : _a.yes
      },
      bhv_service    : _K.char.empty,
      bhv_spin       : {
        start        : _a.off
      }
    };
  }
// ========================
//
// ========================

// ===========================================================
// initialize
//
// ===========================================================
  initialize() {
    this.options.svc = 1;
    return require.ensure(['application'], ()=> {
      const url = bootstrap().websocketApi;
      const path = bootstrap().websocketPath;
      const trialNum = parseInt(localStorage.reconnectionAttempts) || 2;
      const opt = {
        path,
        transports:['websocket', 'polling'],
        reconnection : true,
        reconnectionAttempts : trialNum
      };
      return this._start(require('socket.io-client')(url, opt));
    });
  }

// ===========================================================
// _start
//
// @param [Object] socket
//
// ===========================================================
  _start(socket) {
    const entity = this.getOption(_a.entity);
    const name = `/${entity.get(_a.id)}`;
    this._room = socket.io.socket(name);
    this.debug(`QQQQ _start namespace ns=${name}`, this, this._room, socket);
    this._error = false;
    this._room.on(_e.connect, ()=> {
      return this.debug("QQQQ Eshtablishing connection", this._room);
    });
    this._room.on(_e.welcome, data=> {
      return this.debug("QQQQ welcomeFROM SERVER ", data);
    });
      //@_room.emit 'hello', "ZRZZR", "SSS"
    this._room.on('connect_error', ()=> {
      this.debug("QQQQ Connection lost... ", this._room);
      return this._error = true;
    });
    this._room.on('user_message', message=> {
      this.debug("QQQQ message... ", message);
      return this._error = true;
    });
    return this._room.on(_e.error, msg=> {
      this._error = true;
      if (msg.match(/invalid.namespace/i)) {
        this.debug(`QQQQ trying to create name ${name} // ${this._room.nsp}`, this._room.connected, this._error);
        this.triggerMethod(_e.service.post, {service: SERVICE.room.open});
      } else {
        this.warn(`QQQQ unexpected error ${msg}`);
      }
      return this.debug("QQQQ ERROR connection", msg, this._room);
    });
  }
// ========================
//
// ========================

// ===========================================================
// __dispatchRest
//
// @param [Object] service
// @param [Object] data
//
// ===========================================================
  __dispatchRest(service, data) {
    this.debug(`QQQ >>TTTT __dispatchRest service=${service}`, data, this._room.connected, this._error);
    switch (service) {
      case SERVICE.room.open:
        if (!this._room.connected && this._error) {
          this.debug("Trying to reconnect after restart");
          this._error = false;
          return this._room.connect();
        }
        break;
    }
  }

// ===========================================================
// handle_error
//
// @param [Object] xhr
//
// ===========================================================
  handle_error(xhr) {
    this.debug("QQQ >>TTTT DISCONNECTING", xhr);
    return this._room.disconnect();
  }
}
__room.initClass();

module.exports = __room;
