// ==================================================================== *
//   Copyright Xialia.com  2011-2021
//   FILE : /src/drumee/modules/skeleton/sponsor.js
//   TYPE : Skeleton
// ==================================================================== *

const __skl_dmz_sponsor = function(manager, data) {
  let username;
  if (!_.isEmpty(data)) {
    username = data[0].sender; //manager.model.get('sender')
  } else { 
    username = "Many people";
  }
  const msg2 = `<span class=\"dmz__label--bold\">${username}</span> uses our new universal Webdesk.<br /> A private, free, all in one computer online!`;
  const a = SKL_Box_V(manager, {
    styleOpt  : { 
      width   : _K.size.half
    },
    className : "u-ai-center px-20",
    kids      : [
      SKL_Box_V(manager, {
        kidsOpt     : { 
          className : "dmz__label mb-34"
        },
        className   : "u-ai-center mb-30",
        kids: [    
          SKL_Note(null, "Haven’t joined us yet?"),
          SKL_Note(null, msg2)
        ]
      }),
      SKL_Note(null, "Join us", {className: "dmz__btn dmz__btn--accent"})
    ]
  });

  if (__BUILD__ === 'dev') { DBG_PATH(a, 'dmz/skeleton/sponsor'); }
  return a;
};
module.exports = __skl_dmz_sponsor;
