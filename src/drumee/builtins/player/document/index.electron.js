const __player = require('./index');
const { makeHeaders } = require("core/socket/utils")

const Sessions = new Map();

class __player_document extends __player {

  /**
   * 
   * @param {*} opt    */
  initialize(opt) {
    super.initialize(opt);
    let httpHeaders = {
      ...makeHeaders(),
      'x-param-reader-name': "pdfjs",
    };
    this._headers = {
      httpHeaders,
      withCredentials: true,
    }
  }

  /**
   * 
   * @param {*} cmd 
   * @param {*} args 
   * @returns 
   */
  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.model.get(_a.service);
    this.debug("AAA:38", service, cmd);
    switch (service) {
      case _e.edit:
        let data = this.media.getDataForSync();
        MfsScheduler.log('media.open', { ...data, origin: 'realtime' });
        return;
      default:
        return super.onUiEvent(cmd);
    }
  }

}

module.exports = __player_document;
