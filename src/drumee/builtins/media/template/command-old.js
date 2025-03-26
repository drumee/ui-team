// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : __dbg_path
//   TYPE : Template
// ==================================================================== *

//-------------------------------------
// 
//-------------------------------------
const __media_tpl_command = function(media){
  // _dbg '_directCmd', media.mget('accessibility'), media.mget(_a.filetype)
  const cb = `\
<div id=\"${media._id}-cb\" data-service=\"tick\" class=\"media-checkbox-wrapper\"> \
<svg data-service=\"tick\" class=\"media-checkbox full\"> \
<use xmlns:xlink=\"http://www.w3.org/1999/xlink\" xlink:href=\"#--icon-checkbox\"></use> \
</svg> \
</div>\
`;
  const share =  `\
<div id=\"${media._id}-sharing\" data-service=\"outbound\" class=\"media-sharing-wrapper\"> \
<svg data-service=\"outbound\" class=\"media-sharing full\"> \
<use xmlns:xlink=\"http://www.w3.org/1999/xlink\" xlink:href=\"#--icon-desktop_sharing\"></use> \
</svg> \
</div>\
`;
  const shareWithMe = `\
<div id=\"${media._id}-sharing\" data-service=\"inbound\" class=\"media-sharing-wrapper --with-me\"> \
<svg data-service=\"inbound\" class=\"media-sharing full\"> \
<use xmlns:xlink=\"http://www.w3.org/1999/xlink\" xlink:href=\"#--icon-desktop_mysharing\"></use> \
</svg> \
</div>\
`;

  const access =  `\
<div id=\"${media._id}-accessible\" data-service=\"access\" class=\"media-sharing-wrapper\"> \
<svg data-service=\"access\" class=\"media-sharing full\"> \
<use xmlns:xlink=\"http://www.w3.org/1999/xlink\" xlink:href=\"#--icon-desktop_sharing\"></use> \
</svg> \
</div>\
`;
  const information =  `\
<div id=\"${media._id}-information\" data-service=\"info\" class=\"media-sharing-wrapper media-information-wrapper\"> \
<svg data-service=\"info\" class=\"media-sharing full\"> \
<use xmlns:xlink=\"http://www.w3.org/1999/xlink\" xlink:href=\"#--icon-desktop_information\"></use> \
</svg> \
</div>\
`;
  // lp = media.logicalParent
 
  if (media.mget(_a.shared) === _a.inbound) {
    if (media.mget(_a.createTime) === '0') {
      return cb;
    }
    return cb + shareWithMe;
  }
    
  if (media.mget(_a.shared) === _a.outbound) {  
    return cb + share;
  }

  // if media.mget(_a.shared) in [_a.inbound, _a.outbound]
  //   if lp.mget(_a.state) is 1      
  //     if media.mget(_a.shared) is _a.inbound
  //       if media.mget('ctime') is '0'
  //         return cb
  //       else
  //         return cb + shareWithMe
  //     else
  //       return cb + share
  //   else
  //     return cb + share

  if (media.mget(_a.filetype) === _a.hub) {
    return cb;
  }

  if (media.mget(_a.area) === _a.private) {

    if (parseInt(media.mget(_a.privilege)) & _K.permission.admin) {
      return cb + access;
    }

    return cb + information;
  }

  return cb;
};

 

module.exports = __media_tpl_command;
