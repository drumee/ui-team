const Sessions = new Map();

/**
 * 
 * @returns 
 */
function defultHeaders() {
  if (typeof (Visitor) == 'object') {
    return {
      'x-param-lang': Visitor.language(),
      'x-param-page-language': Visitor.pagelang(),
      'x-param-device': Visitor.device(),
      'x-param-device-id': Visitor.deviceId(),
    };
  }
  return {}
}

/**
 * 
 * @returns 
 */
function defaultPayload() {
  if (typeof (Visitor) == 'object') {
    return {
      socket_id: Visitor.get(_a.socket_id),
      device_id: Visitor.deviceId(),
    };
  }
  return {}
}

/**
 * 
 * @param {*} params 
 * @returns 
 */
export function makeHeaders(params = {}, xhr) {
  let { keysel, sid } = bootstrap()
  let headers = {
    'Accept': '*/*',
    'Content-Type': 'application/json',
    ...defultHeaders(),
    ...params,
  };

  if (params.keysel) {
    keysel = params.keysel;
  }

  if (keysel) {
    let sessionKey = Sessions.get(keysel);
    if (!sessionKey) {
      headers["x-param-keysel"] = keysel;
      if (sid) {
        headers[`x-param-${keysel}`] = sid;
      }
    } else {
      headers[`x-param-${keysel}`] = sessionKey;
    }
  }

  for (let k in headers) {
    let value = encodeURI(headers[k]);
    if (/[_ ]+/.test(k)) {
      delete headers[k];
      k = k.replace(/[_ ]+/g, '-');
      headers[k] = value;
    }
    if (xhr) {
      xhr.setRequestHeader(k, value);
    }
  }

  return headers;
}

/**
 * 
 * @param {*} params 
 * @returns 
 */
export function makeOptions(params = {}) {
  let headers = {};
  if (params.headers) {
    headers = { ...params.headers };
    delete params.headers;
  }
  let res = {
    mode: "cors",
    cache: "default",
    guard: "request",
    headers: makeHeaders(headers),
    socket_id: Visitor.get(_a.socket_id),
    device_id: Visitor.deviceId(),
    ...params,
  };
  return res;
}

/**
 * Updates visitor session state
 * @param {*} payload 
 * @returns 
 */
function updateConnectionState(payload) {
  if (typeof (Visitor) != 'object') return;
  Visitor.set({ connection: payload.__status__ });
}


/**
 * 
 * @returns 
 */
const handleResponse = async (view, response) => {
  let payload = await response.json();
  updateConnectionState(payload);
  const { status } = response;
  switch (status) {
    case 200:
      if (payload.error) {
        if (_.isFunction(view.onServerComplain)) {
          view.onServerComplain(payload);
        } else {
          view.warn("Response contains error field", paylaod);
          throw payload;
        }
      }
      if (_.isFunction(view.__dispatchRest)) {
        let { __ack__, data } = payload;
        view.__dispatchRest(__ack__, data);
      }
      return payload.data || payload;
    default:
      view.warn("Server status", status)
      throw (response);
  }
}

/**
 * 
 * @param  {...any} args 
 * @returns 
 */
export function preparePayload(...args) {
  let service;
  if (_.isString(args[0])) {
    service = args.shift();
  } else {
    service = args.service;
    delete args.service;
  }

  const payload = {
    ...defaultPayload(),
    ...args.shift()
  };
  if (!service) {
    ({ service } = payload);
    delete payload.service;
  }
  sanitize(payload);
  return { service, payload }
}
/**
 * 
 * @param {string} url 
 * @param {object} data 
 * @returns 
 */
export async function doRequest(url, data) {
  return fetch(url, data).then(async response => {
    return handleResponse(this, response);
  }).catch(err => {
    let message = `Got error while running service`
    this.warn(`[176] ${message}`, this, url, err);
    if (_.isFunction(this.onServerComplain)) {
      this.onServerComplain(err);
    } else {
      this.warn(`[176] ${message}`, url, err);
      throw (err);
    }
  });
}

/**
 * 
 * @param {*} opt 
 */
export function sanitize(opt) {
  delete opt.widgetId;
  delete opt.uiHandler;
  delete opt.partHander;
  delete opt.errorHander;
}

/**
 * Handle sessions keys when we can not rely on browser cookies.
 * Sessions must not be readable. It's only writable.
 * @param {*} key 
 * @param {*} value 
 * @returns 
 */
export function setAuthorization(key, value) {
  if (!key && !value) return;
  if (key && !value) {
    Sessions.delete(key);
  }
  Sessions.set(key, value);
}

