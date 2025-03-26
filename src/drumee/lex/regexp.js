// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/lex/regexp
//   TYPE : 
// ==================================================================== *

const a = {
  char              : {
    space           : ' ',
    colon           : ':',
    dot             : '.',
    diese           : '#',
    pipe            : '|',
    semi_colon      : ';',
    slash           : '/',
    url             : '://',
    cr              : '\n'
  },
  string            : {
    arg1            : "$1: "
  },
  tag               : {
    mobile          : new RegExp(/iPhone|iPad|iPod|Windows Phone|IEMobile|Opera Mini|Android|BlackBerry|ARM|Touch|NOKIA|Lumia/i)
  },
  regexp            : {
    arrow           : new RegExp(/\ *=>\ */),
    assign          : new RegExp(/\ *[:=]\ */),
    block           : new RegExp(/[;\n]/g),
    booleanString   : new RegExp(/(true)|(false)/ig),
    bracket         : new RegExp(/\ *\(|\ *\) */g),
    channel         : new RegExp(/[>!+]/),
    colon           : new RegExp(/\ *:\ */),
    comma           : new RegExp(/\ *,\ */),
    ease            : new RegExp((/\w+\.\w+/)),
    email           : new RegExp(/^([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/),
    equal           : new RegExp(/\ *=\ */),
    hash            : new RegExp(/^(\#!|\#)/),
    href            : new RegExp(/^http|(\w+)\.(\w{2,})$/),
    httpx           : new RegExp(/^http.*:/i),
    instruction     : new RegExp(/; *\n| *\n/),
    isBox           : new RegExp(/^(box|container):/),
    isContainer     : new RegExp(/(pulldown)|_(box|container)$|^(box|container):/),
    isDraggable     : new RegExp(/(free)|(absolute)|(fixed)/),
    isDroppable     : new RegExp(/_(box|container)$|^(box|container):|(:film$)|(:slide$)/),
    isNote          : new RegExp(/widget:note$/),
    isPage          : new RegExp(/(^page$)|(^root$)/),
    isResizable     : new RegExp(/(free)|(absolute)|(fixed)/),
    newline         : new RegExp(/\n/g),
    sysPartName     : new RegExp(/\$(\w+)\$$/),
    semiColon       : new RegExp(/\ *;\ */),
    specials        : new RegExp(/[ ,;\n]/g),
    urlSeparator    : new RegExp(/[\/&\?]/g)
  },
  pagename          : new RegExp(/(^(?!^(--|\#|\!|\?))[^(\/|\&)]+$)/),
//    bracket         : new RegExp /^{|}$/g
//    properties      : new RegExp /\"([^(\")\"]+)\":/g
  photo             : {
    public          : 'photo_pub',
    restricted      : 'photo_res',
    private         : 'photo_prv'
  }
};
module.exports = a;
