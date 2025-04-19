/**
 * @license
 * Copyright 2024 Thidima SA. All Rights Reserved.
 * Licensed under the GNU AFFERO GENERAL PUBLIC LICENSE, Version 3 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://www.gnu.org/licenses/agpl-3.0.html
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */
const Path = require('path');
const _ = require('lodash');

// ======================================================
//
// ======================================================
String.prototype.random = function (l = 16) {
  let crypto = require("crypto");
  return crypto.randomBytes(16).toString('base64').replace(/[\+\/=]+/g, '');
};



//########################################
// String superset to make sprintf equivalent
//########################################
String.prototype.format = function () {
  let formatted = this;
  for (let i = 0, end = arguments.length - 1, asc = 0 <= end; asc ? i <= end : i >= end; asc ? i++ : i--) {
    const regexp = new RegExp('\\{' + i + '\\}', 'gi');
    formatted = formatted.replace(regexp, arguments[i]);
  }
  return formatted;
};

String.prototype.unixPath = function () {
  if(/^(\/+|\\+|\.)( *)$/.test(this)) return '/';
  let dir = this.toString("utf8");
  return dir.replace(/(\\+|\/{2,})/g, '/').replace(/(\/+)$/g, '').replace(/\<.*\>/g, '');
};

String.prototype.filename = function () {
  let filepath  = this.toString("utf8");
  let re = new RegExp(`${Path.extname(filepath)}$`);
  let filename = Path.basename(filepath).replace(re, '');
  let ext = Path.extname(filepath).replace(/^\./, '');
  return {filename, ext}
};


// --------------------
// 
// --------------------
const EMAIL = new RegExp(/^([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/);
String.prototype.isEmail = function () {
  return EMAIL.test(this.trim())
}

// --------------------
// 
// --------------------
const PHONE = new RegExp(/^ *(\+|[0-9])[\.:,_\-0-9]+ *$/);
String.prototype.phoneNumber = function () {
  let s = this.replace(/[ \-\.\:]+/g, '').trim();
  if (PHONE.test(s)) return s;
  return null;
}

// --------------------
// 
// --------------------
String.prototype.extension = function () {
  const a = this.split('.');
  if (a.length > 1) {
    return a.pop();
  }
  return "bin";
}

Number.prototype.pad = function (size) {
  var s = this + "";
  while (s.length < size) s = "0" + s;
  return s;
};
