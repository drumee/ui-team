

/**
 * 
 * @param {*} ext 
 * @param {*} opt 
 * @returns 
 */
Backbone.View.prototype.initHandlers = function (ext, opt) {
  if (ext == null) { ext = {}; }
  if (opt == null) { opt = { fork: false, recycle: false }; }
  ext.fork = opt.fork;
  return this.declareHandlers(ext);
};


/**
 * 
 * @param {*} l 
 * @returns 
 */
Backbone.View.prototype.addListener = function (l) {
  if ((this.listeners == null)) {
    this.listeners = [];
  }
  if (_.isArray(l)) {
    return this.listeners = this.listeners.concat(l);
  } else {
    return this.listeners.push(l);
  }
};

/**
 * 
 * @param {*} s 
 * @param {*} args 
 * @returns 
 */
Backbone.View.prototype.bubbleService = function (s, args) {
  if (args == null) { args = {}; }
  this.service = s;
  this._args = args;
  return this.triggerHandlers();
};

/**
 * {String} signal
 * {any} ...arg
 * @returns 
 */
Backbone.View.prototype.fireEvent = function (signal, ...args) {
  this.trigger(signal, ...args); // signal, args
  if ((this.listeners == null)) {
    return;
  }
  for (var l of Array.from(this.listeners)) {
    if (l && !l.isDestroyed()) {
      if (_.isFunction(l.triggerMethod)) {
        l.triggerMethod(signal, ...args)
      } else {
        l.trigger(signal, ...args)
      }
    }
  }
};


/**
 * subsicribe to web socket events
 * @returns 
 */
Backbone.View.prototype.bindEvent = function () {
  const args = Array.prototype.slice.call(arguments);
  args.push(this);
  if ((typeof wsRouter === 'undefined' || wsRouter === null)) {
    return RADIO_NETWORK.once(_e.websocketReady, ws => {
      ws.bindEvent.apply(ws, args);
    });
  }
  if (!wsRouter.isOk()) {
    return RADIO_NETWORK.once(_e.websocketReady, ws => {
      ws.bindEvent.apply(ws, args);
    });
  }
  wsRouter.bindEvent.apply(wsRouter, args);

};

/**
 * unsubsicribe to web socket events
 * @returns 
 */
Backbone.View.prototype.unbindEvent = function () {
  if ((typeof wsRouter === 'undefined' || wsRouter === null)) {
    return;
  }
  return wsRouter.unbindEvent(this);
};

