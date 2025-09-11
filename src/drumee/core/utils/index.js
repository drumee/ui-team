const { Autolinker } = require("autolinker");
const Filesize = require("filesize");

let VERBOSITY = parseInt(localStorage.logLevel) || 0;
const { LOG_LEVEL, BOOLEAN, STATE, RADIO } = require("./constants")

/**
 * 
 * @param {*} v 
 */
window.setLogLevel = function (v) {
  let name;
  if (typeof (v) == 'number') {
    VERBOSITY = v;
    localStorage.logLevel = VERBOSITY;
    for (let k in LOG_LEVEL) {
      if (LOG_LEVEL[k] == v) {
        name = k;
        break;
      }
    }
  } else if (typeof (v) == 'string' && LOG_LEVEL[v]) {
    VERBOSITY = LOG_LEVEL[v];
    localStorage.logLevel = VERBOSITY;
    name = v;
  }
  console.log(`Log level is ${name} (${VERBOSITY})`)
};

/**
 * No operation
 */
window.noOperation = function () { };


/**
 * 
 * @param {*} name 
 * @returns 
 */
export function log(name) {
  if (!name) return VERBOSITY;
  return VERBOSITY >= LOG_LEVEL[name];
};



/**
 *
 * @param {*} c
 * @returns
 */
export function clarityToAlpha(c) {
  let a = (100 - c) / 100;
  if (a > 1) {
    a = 1;
  }
  if (a < 0) {
    a = 0;
  }
  return a;
}

/**
 * 
 * @returns 
 */
export function colon() {
  switch (Visitor.language()) {
    case "fr":
      return " :";
    default:
      return ":";
  }
}


/**
 * 
 * @param {*} name 
 * @param {*} s 
 * @param {*} l 
 * @returns 
 */
export function colorFromName(name, s, l) {
  if (s == null) {
    s = 40;
  }
  if (l == null) {
    l = 60;
  }
  let hash = 0;
  let i = 0;
  while (i < name.length) {
    hash = name.charCodeAt(i) + (hash << 5) - hash;
    i++;
  }
  const h = hash % 360;
  const r = `hsl(${h}, ${s}%, ${l}%)`;
  return r;
}

/**
 * 
 * @param {*} format 
 * @returns 
 */
export function today(format) {
  const f = format || Visitor.dateformat();
  return Dayjs().format(f);
}



/**
 * 
 * @param {*} val 
 * @param {*} opt 
 * @returns 
 */
export function filesize(val, opt) {
  if (val == null || val == undefined) val = 0;
  return Filesize(val, { locale: Visitor.language(), ...opt });
}



/**
 * 
 * @param {*} data 
 */
export function copyToClipboard(data) {
  const el = document.createElement("textarea");
  el.value = data;
  el.setAttribute("readonly", "");
  el.style.position = "absolute";
  el.style.left = "-9999px";

  document.body.appendChild(el);
  const selected =
    document.getSelection().rangeCount > 0
      ? document.getSelection().getRangeAt(0)
      : false;
  el.select();

  document.execCommand("copy");
  document.body.removeChild(el);
  if (selected) {
    document.getSelection().removeAllRanges();
    document.getSelection().addRange(selected);
  }
}

/**
 * 
 * @param {*} val 
 * @returns 
 */
export function toOnOff(val) {
  if (val) {
    return _a.on;
  }
  return _a.off;
}



/**
 * 
 * 
 * @param {*} str 
 * @returns 
 */
export function isHTML(str) {
  const a = document.createElement("div");
  a.innerHTML = str;
  for (let c of Array.from(a.childNodes)) {
    if (c.nodeType === 1) {
      return true;
    }
  }
  return false;
}


/**
 * 
 * @param {*} sec 
 * @returns 
 */
export function timestamp(sec) {
  if (sec == null) {
    sec = 0;
  }
  const ts = new Date().getTime();
  if (sec) {
    return Math.round(ts / 1000);
  }
  return ts;
}


/**
 * 
 * @param {*} format 
 * @returns 
 */
export function timeNow(format) {
  if (format == null) {
    format = "YY-MM-DD-hh-mm";
  }
  const d = new Date();
  return Dayjs(d.getTime()).format(format);
}

/**
 * 
 * @param {*} time 
 * @param {*} format 
 * @returns 
 */
export function dayOfTime(time, format) {
  if (format == null) {
    format = "DD/MM/YYYY";
  }
  return Dayjs(time, "X").format(format);
}

/**
 * 
 * @param {*} url 
 * @returns 
 */
export function loadJS(url) {
  const a = new Promise(function (resolve, reject) {
    const xhr = new XMLHttpRequest();
    xhr.allowCORS(xhr, url);
    xhr.open("GET", url, true);
    xhr.onload = function (e) {
      const el = document.createElement(_a.script);
      el.setAttribute(_a.text, "text/javascript");
      el.type = "text/javascript";
      el.setAttribute("charset", "utf-8");
      el.setAttribute("async", "");
      el.innerHTML = xhr.responseText;
      document.head.appendChild(el);
      resolve(xhr);
    };

    xhr.onerror = function (e) {
      reject(xhr);
    };

    xhr.send();
    return xhr;
  });
  return a;
}

/**
 * 
 * @param {*} v 
 * @returns 
 */
export function toggleState(v) {
  if (STATE[v] != null) {
    return STATE[v];
  }
  if (v) {
    return 1;
  }
  return 0;
}

/**
 * 
 * @param {*} v 
 * @returns 
 */
export function radioState(v) {
  if (RADIO[v] != null) {
    return RADIO[v];
  }
  return 0;
}

/**
 * 
 * @param {*} v 
 * @returns 
 */
export function toBoolean(v) {
  if (BOOLEAN[v] != null) {
    return BOOLEAN[v];
  }
  return false;
}


/**
 * 
 * @param {*} x 
 * @returns 
 */
export function isNumeric(x) {
  if (_.isNumber(x)) {
    return true;
  }
  if (_.isString(x)) {
    if (x.match(/^[0-9]+(\.)*[0-9]\%$/)) {
      return false;
    }
    return x.match(/[0-9]\.*[0-9]*/) || x.match(/([0-9]\.*[0-9]*)px/i);
  }
  return false;
}

/**
 * 
 * @param {*} outer 
 * @param {*} inner 
 * @returns 
 */
export function fitBoxes(outer, inner) {
  let hi, wi;
  outer.height = parseInt(outer.height);
  outer.width = parseInt(outer.width);
  inner.height = parseInt(inner.height) || outer.height;
  inner.width = parseInt(inner.width) || outer.width;
  const innerRatio = inner.width / inner.height;
  const outerRatio = outer.width / outer.height;
  if (outerRatio > innerRatio) {
    wi = (inner.width * outer.height) / inner.height;
    hi = outer.height;
  } else {
    wi = outer.width;
    hi = (inner.height * outer.width) / inner.width;
  }
  const scaled = outerRatio / innerRatio;
  const _box = {
    width: wi,
    height: hi,
    scaled,
  };
  return _box;
}

/**
 * 
 * @param {*} string 
 * @returns 
 */
export function capFirst(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

/**
 * 
 * @param {*} sortByFunction 
 * @returns 
 */
export function reverseSortBy(sortByFunction) {
  return function (left, right) {
    var l = sortByFunction(left);
    var r = sortByFunction(right);

    if (l === void 0) return -1;
    if (r === void 0) return 1;

    return l < r ? 1 : l > r ? -1 : 0;
  };
}

/**
 * 
 * @param {*} name 
 * @returns 
 */
export function modelComparator(name) {
  return function modelComparator (model) {
    let v = model.get(name);
    if(v.toLowerCase){
      return v.toLowerCase();
    }
    return v;
  }
}

/**
 * 
 * @param {*} size 
 * @returns 
 */
export function toPercent(size) {
  size = size * 100;
  return `${Math.round(size)}%`;
}




/**
 * 
 * @param {*} val 
 * @returns 
 */
export function arcLength(val) {
  const c = Math.PI * (80 * 2);

  if (val < 0) {
    val = 0;
  }
  if (val > 100) {
    val = 100;
  }

  const pct = ((100 - val) / 100) * c;
  return `${pct}`;
}

/**
 *
 * @param {*} msg
 */
export function openUserMailAgent(msg) {
  let subject = msg.subject || msg.title || "";
  let body = msg.body || msg.message || "";
  subject = encodeURIComponent(subject);
  body = encodeURIComponent(Autolinker.link(body));
  var mailToLink = `?subject=${subject}&body=${body}`;
  if (msg.recipients) {
    if (_.isString(msg.recipients)) {
      mailToLink = `mailto:${msg.recipients}${mailToLink}`;
    } else if (_.isArray(msg.recipients)) {
      let r = msg.recipients.join(";");
      mailToLink = `mailto:${r}${mailToLink}`;
    }
  } else {
    mailToLink = `mailto:${mailToLink}`;
  }
  const a = document.createElement(_K.tag.a);
  a.hidden = "";
  a.setAttribute(_a.href, mailToLink);
  a.setAttribute(_a.target, "_blank");
  a.style.position = _a.absolute;
  a.style.display = _a.none;
  var clickHandler = () => {
    const f = () => {
      a.removeEventListener(_e.click, clickHandler);
      a.remove();
    };
    _.delay(f, 300);
  };
  a.addEventListener(_e.click, clickHandler, false);
  a.click();
}


/**
 * 
 * @param {*} link 
 * @returns 
 */
export function openLink(link) {
  if (window.open(link, "_blank") == null) {
    return alert(LOCALE.WINDOW_BLOCKED);
  }
}

/**
 * 
 * @param {*} len 
 * @param {*} sep 
 * @returns 
 */
export function randomString(len, sep) {
  if (len == null) {
    len = 1;
  }
  if (sep == null) {
    sep = "";
  }
  const a = new Uint32Array(len);
  const b = window.crypto.getRandomValues(a);
  const c = [];
  b.forEach((e) => c.push(e.toString(16)));
  return c.join(sep);
}

/**
 * 
 * @param {*} e 
 * @returns 
 */
export function dataTransfer(e) {
  let item;
  let res = { folders: [], files: [] };
  switch (e.type) {
    case _e.drop:
      var dt = e.originalEvent.dataTransfer;
      if (dt == null) {
        return res;
      }
      var items = dt.items || dt.files || [];

      var folders = [];
      var entries = [];
      var files = [];

      for (item of Array.from(items)) {
        if (_.isFunction(item.getAsEntry)) {
          entries.push(item.getAsEntry());
        } else if (_.isFunction(item.webkitGetAsEntry)) {
          entries.push(item.webkitGetAsEntry());
        }
      }

      for (let entry of Array.from(entries)) {
        if (entry && entry.isDirectory) {
          folders.push(entry);
        } else if (entry && entry.isFile) {
          files.push(entry);
        }
      }
      res = { folders, files };
      break;
    case _e.change:
      items = e.target.items || [];
      files = e.target.files || [];
      folders = [];
      for (item of Array.from(items)) {
        if (_.isFunction(item.getAsEntry)) {
          folders.push(item.getAsEntry());
        } else if (_.isFunction(item.webkitGetAsEntry)) {
          folders.push(item.webkitGetAsEntry());
        }
      }
      res = { folders, files };
      break;
    default:
      console.warn("Got wrong type", e);
  }
  return res;
}

/**
* 
* @param {*} fonts 
* @param {*} id 
* @returns 
*/
export function appendFontFace(fonts, id) {
  if (!_.isArray(fonts)) {
    return;
  }
  const { main_domain } = bootstrap();
  const p = location.protocol + "//";
  id = id || Host.get(_a.id);
  id = `--font-face-${id}`;
  let el = document.getElementById(id);
  if (el != null) {
    document.head.removeChild(el);
  }
  el = document.createElement(_a.style);
  el.setAttribute(_a.id, id);
  el.setAttribute(_a.type, "text/css");
  el.setAttribute("rel", _a.stylesheet);
  el.setAttribute(_a.media, _a.screen);
  const list = [];
  for (let f of Array.from(fonts)) {
    var l1, url;
    if (_.isEmpty(f.local1)) {
      l1 = f.name;
    } else {
      l1 = f.local1;
    }
    url = `${protocol}://${main_domain}${f.url}`
    const src = `local('${l1}'), local('${f.local2}'), url(${url}) format('${f.format}')`;
    const fn = f.name || f.family;
    const str = `@font-face {\n \
font-family:'${fn}';\n \
font-style: ${f.style};\n \
font-weight: ${f.weight};\n \
src: ${src};\n \
}\n`;
    list.push(str);
  }
  el.appendChild(document.createTextNode(list.join(" ")));
  return document.head.appendChild(el);
}


/**
 * 
 * @param {*} url 
 * @returns 
 */
export function appendLink(url) {
  return new Promise((resolve, reject) => {
    const id = this._ensureEl(url, "link");
    // id  = opt.id
    if (id == null || id === undefined) {
      this.debug("Injecting undefined link", url);
      return reject();
    }
    const el = document.createElement(_a.link);
    el.setAttribute("id", id);
    el.setAttribute("rel", _a.stylesheet);
    el.setAttribute("href", url);
    el.setAttribute("media", "screen");
    const xhr = new XMLHttpRequest();
    xhr.allowCORS(xhr, url);
    xhr.open("GET", url, true);
    xhr.send();
    return (xhr.onloadend = function (e) {
      document.head.appendChild(el);
      resolve(e);
    });
  });
}
