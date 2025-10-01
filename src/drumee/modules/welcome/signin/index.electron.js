/* ==================================================================== *
 *   Copyright Xialia.com  2011-2020
 *   FILE : /src/drumee/modules/welcome/signin/index.js
 *   TYPE : Component
 * ==================================================================== */
/// <reference path="../../../../../@types/index.d.ts" />
const { xhRequest } = require("core/socket/request");
const { setAuthorization } = require("core/socket/utils");

const SESSION_ID = 'regsid';
const __web_signin = require("./index");

/**
 * Class representing signin page in Welcome module.
 *
 * @class ___welcome_signin_electron
 * @extends __web_signin
 */

class __welcome_signin extends __web_signin {


  /**
   *
   */
  hello() {
    Visitor.clear();
    Visitor.set(this.data);
    uiRouter.restart();
  }

  /**
   * 
  */
  changeHost(host) {
    /** DO NOT REMOVE */
  }

  /**
   * 
   * @param {*} data 
   */
  async gotSignedIn(data) {
    this.debug("AAA:44", data);
    await Account.changeEndpoint(data);
    super.gotSignedIn(data)
  }


  /**
   *
   * @param {*} xhr
   * @param {*} cb
   * @returns
   */
  async checkEndpointResponse(xhr, endpointName) {
    try {
      const response = JSON.parse(xhr.responseText);
      if (response.error) {
        this.error(response);
        return {};
      }
      const { data } = response;
      if (!data || !data.isvalid) {
        this.renderMessage(LOCALE.PLEASE_ENTER_VALID_URL);
        return
      }
      let sid = xhr.getResponseHeader(SESSION_ID);
      if (!sid) {

      }
      data.sid = sid;
      data.endpointName = endpointName;
      Drumee.init_globals(data)
      await Account.changeEndpoint(data);
      return data;
    } catch (e) {
      return {};
    }
  }

  /**
   *
   * @param {*} url
   */
  joinEndpoint(url) {

    if (!url) {
      this.validateData();
      url = this.__refUrl.getValue();
    }
    if (!url) {
      this.renderMessage(LOCALE.ENTER_POD_URL);
      return
    }
    let { appRoot, protocol } = bootstrap()
    if (!/^http/.test(url)) {
      url = `${protocol}://${url}`
    }
    let { host, pathname } = new URL(url)
    let re = new RegExp(`(^.*${appRoot}/)|(/.*$)`, "g")
    let endpointName = pathname.replace(re, "")

    let svc = '/svc/butler.check_domain';
    if (endpointName) {
      svc = `${appRoot}/${endpointName}${svc}`;
    } else {
      svc = `${appRoot}${svc}`;
    }
    url = `https://${host}${svc}`;
    let opt = {
      responseType: "raw",
    }
    let spinner;
    let timer = setTimeout(() => {
      this.__refUrl.append({ kind: 'spinner' });
      spinner = this.__refUrl.children.last();
    }, 2000);
    xhRequest(url, opt).then(async (xhr) => {
      await this.checkEndpointResponse(xhr, endpointName);
      let opt = require("./skeleton/electron/auth")(this);
      this.feed(this._skeleton(this, opt));
      if (spinner) spinner.cut();
      clearTimeout(timer);
    }).catch((e) => {
      this.warn("Failed to join endpoint", url, e)
      this.renderMessage(LOCALE.PLEASE_ENTER_VALID_URL);
      if (spinner) spinner.cut();
      clearTimeout(timer);
    });
  }


  /**
   * 
   * @param {*} trigger 
   */
  async changeEndpoint(trigger) {
    let endpoint = trigger.mget(_a.endpoint);
    if (this.selectedEndpoint === trigger) {
      this.joinEndpoint(endpoint);
      return
    }
    this.selectedEndpoint = trigger;
    let url = `${endpoint}svc/yp.get_env`;
    let keysel = trigger.mget('keysel');
    let sid = trigger.mget('sid');
    setAuthorization(keysel, sid);
    let response = await xhRequest(url);
    this.debug("AAA:151", url, keysel, sid, response);
    let { data } = response;
    if (data && data.user?.signed_in) {
      data.sid = sid;
      data.restart = 1;
      await Account.changeEndpoint(data);
      uiRouter.changeEndpoint(data)
      return
    }
    this.joinEndpoint(endpoint);
  }

  /**
   *
   * @param {View} child
   * @param {String} pn
   */
  onPartReady(child, pn) {
    switch (pn) {
      case "history-wrapper":
        child.once(_e.ready, (e) => {
          Account.listEndpoints().then((data) => {
            child.feed(data);
          });
        })
        break;
      default:
        super.onPartReady(child, pn);
    }
  }

  /**
   * 
   */
  promptEndpoint() {
    let opt = require("./skeleton/electron/url-bar")(this);
    Kind.waitFor('welcome_signin_history').then((k) => {
      this.feed(this._skeleton(this, opt));
    })
  }
  /**
   *
   */
  onDomRefresh() {
    const { main_domain, connection } = bootstrap();
    this.debug("AAA:197", { main_domain, connection })
    if (!main_domain) {
      return this.promptEndpoint();
    }
    switch (connection) {
      case "otp":
      case "online":
        return super.onDomRefresh();

      default:
        let tab = Visitor.parseModule()[2];
        let opt;
        switch (tab) {
          case "url":
          case "org":
            return this.promptEndpoint();
          default:
            opt = require("./skeleton/electron/auth")(this);
            this.feed(this._skeleton(this, opt));
        }
    }
  }

  /**
   * User Interaction Evant Handler
   * @param {View} cmd
   * @param {Object} args
   */
  async onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.get(_a.service);
    let sid = cmd.mget('sid');
    this.debug(
      `AAA:253 service=${service} sid=${sid}`,
      cmd,
      cmd.isAttached(),
      args
    );
    //return
    switch (service) {
      case "join-endpoint":
        let value = this.__refUrl.getValue();
        this.debug("AAA:56 -- onUiEvent", service, value, cmd.mget(_a.value));
        this.joinEndpoint(value);
        break;
      case "prompt-endpoint":
        let opt = require("./skeleton/electron/url-bar")(this);
        this.feed(this._skeleton(this, opt));
        break;
      case "select-endpoint":
        await this.changeEndpoint(cmd);
        break;
      case "remove-endpoint":
        await Account.removeEndpoint(sid);
        cmd.goodbye();
        break;
      default:
        if (super.onUiEvent) super.onUiEvent(cmd, args);
    }
  }
}

module.exports = __welcome_signin;
