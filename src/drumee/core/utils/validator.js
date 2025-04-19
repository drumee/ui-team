// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : src/drumee/core/utils
//   TYPE : 
// ==================================================================== *
const identRegExp = /^([a-zA-Z0-9_\-])([a-zA-Z0-9_\.\-])([a-zA-Z0-9_\.\-])*$/;
const hostRegExp = /^[a-zA-Z0-9_\-]+$/;
const nameRegExp = /^([a-zA-Z0-9_\.\-\'\ xC0-\xFF])+$/;

const validator = {
  require(v) {
    if (v.trim() === '') {
      return false;
    }
    return true;
  },

  email(v) {
    if (v.trim() !== '') {
      return v.isEmail();
    }
    return true;
  },

  phone(v) {
    if (v.trim() !== '') {
      return v.isPhoneNumer();
    }
    return true;
  },

  emailOrIdent(v) {
    if (v.trim() !== '') {
      return v.isEmail() || identRegExp.test(v);
    }
    return true;
  },

  ident(v) {
    if (v.trim() !== '') {
      return identRegExp.test(v);
    }
    return true;
  },

  host(v) {
    if (v.trim() !== '') {
      return hostRegExp.test(v);
    }
    return true;
  },

  name(v) {
    if (v.trim() !== '') {
      return nameRegExp.test(v);
    }
    return true;
  }
};

module.exports = validator;