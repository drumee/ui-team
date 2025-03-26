const PUBLICKEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAnIK/L0XYx3RW0b9bXnf8
hoeowh4TK7TK4ydOen7PycjQ7EcAQjKm+o9Wjc0AMr46fCGLBQEig+g0+13YeIQL
kBxRnH95pEP7maWWhvmictu9xA3jMvKqgKbX+aFRfGzrtIFEmY78jYjyjMD8Tyul
4qQ582Of3g6vZydWDNWiU2Sku9HiZgGlaHXRFr/Sp3zOoSRA9dz6pOs913Fy0doF
iNDUFK6sLnx0X/lmyKU7sFstnPYFaZqXy11Nr13lMGxwLTx+KgS46pTpe+MuQ0qg
twUB8PX/OrR4TAmYhGinq5v+L+Exm2/LatQojt7/WxvXX7LmnZ9Mh7SfOAbfni/+
VwIDAQAB
-----END PUBLIC KEY-----`;

const { subtle } = window.crypto;

/**
 * 
 * @param {*} str 
 * @returns 
 */
function stringToArrayBuffer(a) {
  let str = window.atob(a);
  const buf = new ArrayBuffer(str.length);
  const bufView = new Uint8Array(buf);
  for (let i = 0, strLen = str.length; i < strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}

/*
 Fetch the contents of the "message" textbox, and encode it
 in a form we can use for sign operation.
 */
function getMessageEncoding(message) {
  let enc = new TextEncoder();
  return enc.encode(message);
}

/**
 * 
 * @param {*} publicKey 
 * @param {*} signature 
 * @param {*} text 
 * @returns 
 */
async function verifyMessage(publicKey, signature, text) {
  let encoded = getMessageEncoding(text);
  return subtle.verify(
    "RSASSA-PKCS1-v1_5",
    publicKey,
    signature,
    encoded
  );
}

/** 
 * 
 */
function importRsaKey(pem) {
  // fetch the part of the PEM string between header and footer
  const pemHeader = "-----BEGIN PUBLIC KEY-----";
  const pemFooter = "-----END PUBLIC KEY-----";
  const pemContents = pem.substring(
    pemHeader.length,
    pem.length - pemFooter.length - 1,
  );
  const binaryPem = stringToArrayBuffer(pemContents);
  return subtle.importKey(
    "spki",
    binaryPem,
    {
      name: "RSASSA-PKCS1-v1_5",
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["verify"],
  );
}

function checkVersion(el, licence) {
  //console.log("AAA:81 checkVersion", licence);
  if (!el || !licence) throw "Licence check failed";
  el.dataset.type = licence.status || 'trial';
  el.dataset.version = licence.version || 'LICENCE_INVALID ';
}

/**
 * 
 * @returns 
 */
async function getLicence(el) {
  if (!el) throw "Licence check failed";
  let { content, signature } = Platform.get('licence') || {};
  let licence = { status: 'invalid', version: "LICENCE_INVALID" };
  try {
    licence = JSON.parse(content);
    if(_.isString(licence)) licence = JSON.parse(licence);
  } catch (e) {
    this.warn("SIGN FAILED", content, e);
    licence = { status: _a.error, version: LOCALE.LICENCE_INVALID };
  }
  //content.domain = "kk.oo";
  let res = false;
  try {
    signature = stringToArrayBuffer(signature);
    let publicKey = await importRsaKey(PUBLICKEY);
    res = await verifyMessage(publicKey, signature, content);
    //this.debug("AAA:110 SIGN CHECK", res, content);
  } catch (e) {
    res = false;
    licence.status = _a.error
  }
  let status = licence.status;
  if (!res) {
    status = _a.error;
  }
  if (licence.domain != bootstrap().main_domain) {
    status = 'wrong_domain';
  }
  licence.status = status;
  switch (status) {
    case _a.active:
      licence.version = Platform.get(_a.version);
      break;
    case 'trial':
      licence.version = LOCALE.EVALUATION_VERSION.format(Platform.get(_a.version))
      break;
    case 'wrong_domain':
      licence.status = _a.error;
      licence.version = LOCALE.LICENCE_WRONG_DOMAIN;
      break;
    default:
      licence.status = _a.error;
      licence.version = LOCALE.LICENCE_INVALID;
  }
  checkVersion(el, licence);
}
//window.getLicence = getLicence;
module.exports = { getLicence };