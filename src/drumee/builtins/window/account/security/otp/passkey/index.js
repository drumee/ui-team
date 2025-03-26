const Otp = require('..')
class otp_passkey extends Otp {


  /**
   *
  */
  onDomRefresh() {
    this.feed(require('../skeleton/verified')(this, 0));
  }

}


module.exports = otp_passkey;
//
