const PP = new RegExp(/^((.+){2,} *(.+){4,})|((.+){12,})$/);
const EMAIL = new RegExp(/^([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/);
const PAGENAME = new RegExp(/(^(?!^(--|\#|\!|\?))[^(\/|\&)]+$)/);
const PHONENUM = new RegExp(/^(\+|[0-9]+)[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s\./0-9]*$/);
const IPV4 = new RegExp(/^(?:(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])(\.(?!$)|$)){4}$/);
const IPV6 = new RegExp(/^[a-fA-F0-9:]+$/);
const NL2BR = new RegExp(/(?:\r\n|\r|\n)/g);
const URL = /^http(.*):\/\/(.+)$/;

// --------------------
// Bem separator
// --------------------
String.prototype.bem = function () {
  let a;
  if (this.match("--")) {
    a = this.split("--")[0] + " " + this;
  } else {
    a = this.toString();
  }
  return a;
};

// --------------------
// Text formater -- sprintf equivalent
// --------------------
String.prototype.format = function () {
  let formatted = this;
  for (let i = 0, end = arguments.length - 1, asc = 0 <= end; asc ? i <= end : i >= end; asc ? i++ : i--) {
    const regexp = new RegExp('\\{' + i + '\\}', 'gi');
    formatted = formatted.replace(regexp, arguments[i]);
  }
  return formatted;
};


// --------------------
// First latter to uppercase
// --------------------
String.prototype.ucFirst = function () { return this[0].toUpperCase() + this.slice(1); };


/**
 * 
 */
String.prototype.isEmail = function () { return EMAIL.test(this.trim()); };

/**
 * 
 */
String.prototype.isPassPhrase = function () { return PP.test(this); };

/**
 * 
 */
String.prototype.isPhoneNumber = function () { return PHONENUM.test(this.trim()); };

/**
 * 
 */
String.prototype.isUrl = function () { return URL.test(this.trim()); };

/**
 * 
 */
String.prototype.isPageName = function () { return PAGENAME.test(this); };

/**
 * 
 */
String.prototype.isIpAddress = function () {
  return IPV4.test(this)(OR(IPV6.test(this)));
};

/**
 * 
 */
String.prototype.underline = function (c) {
  if (c == null) { c = ''; }
  return `<u class=\"${c}\">${this}</u>`;
};

/**
 * 
 */
String.prototype.nl2br = function () {
  return this.replace(NL2BR, '<br>');
};


/**
 * 
 */
String.prototype.extension = function () {
  const a = this.split('.');
  if (a.length > 1) {
    return a.pop();
  }
  return "";
};

/**
 * 
 */
String.prototype.withoutTag = function () {
  return this.replace(/(<([^>]+)>)/gi, "");
};

/**
 * 
 */
String.prototype.printf = function (...args) {
  let a = args.shift();
  if (!a) {
    return this.format(...args);
  }
  if(!args[1]){
    return a.format(this.toString());
  }
  return a.format(...args);
}

/**
 * 
 */
String.prototype.px = function (...args) {
  return this.toString() + 'px';
}

/**
 * 
 */
String.prototype.rem = function (...args) {
  return this.toString() + 'rem';
}

/**
 * 
 */
String.prototype.em = function (...args) {
  return this.toString() + 'em';
}

/**
 * 
 */
String.prototype.deg = function (...args) {
  return this.toString() + 'deg';
}