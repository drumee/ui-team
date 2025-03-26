const Otp = require('..')
class otp_sms extends Otp {


  /**
   *
  */
  onDomRefresh() {
    this.feed(require('../skeleton/verified')(this, 1));
  }

}


module.exports = otp_sms;
//
