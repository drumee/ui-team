// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : desk/skeleton/project-room/invitees-list
//   TYPE : 
// ==================================================================== *

const { timestamp } = require("core/utils")
const URL_BASE = `${location.origin}${location.pathname}`;

const __invitees_list=function(manager, id, email){
  const url = `${URL_BASE}avatar/${id}?${timestamp()}`;
  const a = { 
    kind: KIND.box,
    flow: _a.horizontal,
    className: "sharee-new-contact__item access_list",
    kids: [
      SKL_Note(null, '', { 
        className: "share-info__avatar",
        styleOpt: {
          'background-image'   : `url(${url})`,
          'background-size'    : "cover",
          'background-repeat'  : "no-repeat",
          'background-position': _K.position.center
        }
      }),
      SKL_Note(null, email, {className: "sharee-new-contact__item-text"}),
      SKL_SVG('cross', {className: "sharee-new-contact__item-icon"}, {width: 8, height: 8, padding: 0})
    ]
  };
  if (__BUILD__ === 'dev') { DBG_PATH(a, 'desk/skeleton/project-room/invitees-list'); }
  return a;
};
module.exports = __invitees_list;
