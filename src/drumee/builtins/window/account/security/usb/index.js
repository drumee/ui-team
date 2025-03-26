const __pad = require('../pad');
class __security_usb extends __pad {
  constructor(...args) {
    super(...args);
    this.onPartReady = this.onPartReady.bind(this);
    this._set = this._set.bind(this);
    this.onUiEvent = this.onUiEvent.bind(this);
  }

  static initClass() {
    this.prototype.figName    = "security_usb";
  }
// ===========================================================
// initialize
// ===========================================================

  initialize(opt) {
    super.initialize(opt);
    this.mset({
      icon    : "account_usb",
      label   : LOCALE.ACCESS_BY_USB_KEY
    });

    navigator.usb.addEventListener('connect', e => { 
      return this.debug("CONNECTED", e);
    });

    return navigator.usb.addEventListener('disconnect', e => { 
      return this.debug("DISCONNECTED", e);
    });
  }

// ===========================================================
// onPartReady
// ===========================================================
  onPartReady(child, pn) {
    switch (pn) {
      case "wrapper-tooltips":
        this._tooltips = child;
        return this._offset  = this.$el.offset();
    }
  }


// ===========================================================
// 
// ===========================================================
  _set(cmd) {
    const val = this.findPart('ref-input').getValue();
    this.debug(`PW =${val}`);
    // RSA    = require('hybrid-crypto-js').RSA
    // Crypt  = require('hybrid-crypto-js').Crypt
    // AES256 = require('aes256')

    const rsa = new RSA({
      entropy : _.random(10000),
      keySize : 4096
    });

    rsa.generateKeypair(k=> { 
      this.debug(" publicKey  = ", k.publicKey);
      this.debug(" privateKey = ", k.privateKey);

      const key    = val;
      const plaintext = k.privateKey;
      this.debug(`CYPHERED WITH ${key}`);
      const cipher    = AES256.createCipher(key);
      const encrypted = cipher.encrypt(plaintext);
      const decrypted = cipher.decrypt(encrypted);
      this.debug(" encrypted = ", encrypted);
      return this.debug(" decrypted = ", decrypted);
    });

    const cred = { 
      publicKey: {
        challenge: "",
        rp: { 
          name: "Drumee"
        },
        user: { 
          id: Visitor.id, 
          name: Visitor.name(),
          displayName: Visitor.name()
        },
        authenticatorSelection: { 
          userVerification: "preferred"
        },
        attestation: "direct",
        pubKeyCredParams: [{type: "public-key", alg : -7}]
      }
    };
    const send = ()=> {
      return this.debug("SENDING ....");
    };
    return navigator.credentials.create(cred).then(send).catch(this.warn);
  }

// ===========================================================
// onUiEvent
// ===========================================================

  onUiEvent(cmd) {
    const service = cmd.mget(_a.service);
    this.debug("QQQQQQQQQQQ", service, cmd);
    switch (service) {
      case "close-tooltips":
        return this._tooltips.clear();

      // -------- email ---------
      case _e.close:
        return this._modal.suppress();

      case _e.change:
        var filters = [
          // {vendorId: 32902, productId: 41647}
          {deviceClass: 0, deviceSubclass: 0},
          {deviceProtocol:0}
        ];
        return navigator.usb.requestDevice({filters})
        .then( usbDevice => { 
          return this.debug("GOT DEVICE", usbDevice);
        })
        .catch(e => { 
          return this.debug("There is no device. " + e);
        });
        // navigator.usb.getDevices()
        // .then (devices)=> 
        //   @debug("Total devices: ", devices, devices.length)

        //   devices.forEach (device)=> 
        //     @debug("DDDDDDDD: ",  device);


      case _e.set:
        return this._set(cmd);
    }
  }


// ===========================================================
// __dispatchRest
// ===========================================================

  __dispatchRest(method, data, socket) {
    this.debug("AAAAAAAAAAA", method, this, data);
    switch (method) {
      case SERVICE.drumate.update_profile:
        Visitor.set(_a.profile, data.profile);
        this._modal.feed(require('libs/preset/ack')(
          this, LOCALE.ACK_PHONE_UPDATED, {height:"100%"}
        )
        );
        var f = ()=> {
          return this._modal.goodbye();
        };
        return _.delay(f, Visitor.timeout());
    }
  }
}
__security_usb.initClass();


module.exports = __security_usb;
//
