// ==================================================================== *
//   Copyright Xialia.com  2011-2022
//   FILE : /ui/src/drumee/builtins/window/account/subscription/index.js
//   TYPE : Component
// ==================================================================== *
const APP_HOST = 'app.drumee.com';
class __account_apps extends DrumeeMFS {

  /**
   * @param {*} opt
  */
  initialize(opt) {
    require('./skin');
    super.initialize(opt);
  }


  /**
   * 
  */
  getUrl(platform = this.platform, architecture = this.architecture) {
    let vhost = APP_HOST;
    let path = '';
    this.verbose(`AAA:26, platform=${platform}, architecture=${architecture}`)
    switch (platform) {
      case 'linux':
        path = '/linux/release/drumee-linux-amd64.deb';
        switch (architecture) {
          case 'deb':
            path = `/linux/release/drumee-linux-amd64.deb`;
            break;
          case 'snap':
            path = `/linux/release/drumee-linux-amd64.snap`;
            break;
          case 'rpm':
            path = `/linux/release/drumee-linux-x86_64.rpm`;
            break;
        }
        break;
      case 'mac':
      case 'macos':
        if (/^arm/.test(architecture)) {
          path = `/mac/release/drumee-mac-arm64.dmg`;
        } else {
          path = `/mac/release/drumee-mac-x64.dmg`;
        }
        break;
      case 'win':
      case 'windows':
        if (/^x[0-9]+/.test(architecture)) {
          path = `/win/release/drumee-win-x64.exe`;
        } else {
          path = `/win/release/drumee-win-ia32.exe`;
        }
        break;
    }

    return {
      path, vhost, href: `https://${vhost}${path}`
    }
  }

  /**
   * 
  */
  async guessBrowserInfo() {
    this.packages = {};
    for (let pf of ['win', 'linux', 'mac']) {
      let packages = await this.fetchService(SERVICE.media.show_node_by, {
        nid: `/${pf}/release`, vhost: APP_HOST
      });
      this.debug("AAA:68", packages);
      this.packages[pf] = packages.filter(function (e) {
        return /^(exe|smi|deb|rpm|snap|dmg)$/i.test(e.ext)
      });
    }
    if (navigator.userAgentData) {
      let {
        architecture,
        platform
      } = await navigator.userAgentData.getHighEntropyValues(["architecture", "bitness"]);
      this.architecture = architecture.toLowerCase();
      this.platform = platform.toLowerCase();
    } else {
      let ua = navigator.userAgent;
      if (/linux/i.test(ua)) {
        this.platform = 'linux';
      } else if (/mac *os/i.test(ua)) {
        this.platform = 'mac';
      } else if (/windows/i.test(ua)) {
        this.platform = 'win';
      }
    }

  }

  /**
   * 
  */
  onFetchProgress(e) {
    this.debug(`AAA:79 onFetchProgress`, e)
  }

  /**
   * 
  */
  onEndOfData(e) {
    this.debug(`AAA:88 onEndOfData`, e)
  }

  /**
   * 
  */
  async onDomRefresh() {
    await this.guessBrowserInfo();
    this.declareHandlers();
    this.feed(require("./skeleton")(this));
  }

  /**
  * @param {any} cmd
  * @param {any} args
  */
  async onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.get(_a.service) || cmd.get(_a.name);
    this.debug(`onUiEvent service = ${service}`, cmd, this)
    switch (service) {
      case _a.show:
        if (this.__others) {
          this.__others.feed(require("./skeleton/others")(this))
        }
        break;
      case _a.download:
        let opt = this.getUrl();
        let { stats } = await this.fetchService(SERVICE.media.info, opt);
        this.debug(`AAAA:117`, stats);
        // let opt = { url };
        // this.fetchFile(opt).then((blob) => {
        //   this.debug(`AAAA:117`, blob);
        // })
        break;
    }
  }
}

module.exports = __account_apps;
