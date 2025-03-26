// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : desk/user/template/user
//   TYPE : Templae
// ==================================================================== *


const __desk_user_tpl = function(view){
  const m = view.model;
  const privilege = parseInt(m.get(_a.privilege));
  const priv_text = privilegeToLabel(privilege);
  let ttl = "";
  const d = parseInt(m.get(_a.ttl));
  if (d > 0) {
    ttl = `<div class=\"project-room__list-expiry pl-16\" data-flow=\"x\"> \
<div>${Dayjs.duration(d, "seconds").humanize()}</div> \
</div>`;
  }
  const html = ttl + `\
<div class=\"project-room__list-contact pl-16\" data-flow=\"x\"> \
<div>${m.get(_a.firstname)} ${m.get(_a.lastname)}</div> \
</div> \
<div class=\"project-room__list-access u-ai-center u-jc-sb\" data-flow=\"x\"> \
<div class=\"project-room__list-access-text\">${priv_text}</div> \
<div data-flow=\"x\" class=\"project-room__list-item-actions u-jc-end\"> \
<div id=\"${view._id}-rights\" data-service=\"user-rights\" class=\"project-room__list-item-icon  ml-20\"> \
<svg class=\"full icon\" > \
<use xmlns:xlink=\"http://www.w3.org/1999/xlink\" xlink:href=\"#--icon-desktop_sharebox_edit\"></use> \
</svg> \
</div> \
<div id=\"${view._id}-delete\" class=\"project-room__list-item-icon  ml-20\"> \
<svg class=\"full icon\"> \
<use xmlns:xlink=\"http://www.w3.org/1999/xlink\" xlink:href=\"#--icon-desktop_delete\"></use> \
</svg> \
</div> \
</div> \
</div>\
`;

  const html_admin =  ttl + `\
<div class=\"project-room__list-contact pl-16\" data-flow=\"x\"> \
<div>${m.get(_a.firstname)} ${m.get(_a.lastname)}</div> \
</div> \
<div class=\"project-room__list-access u-ai-center u-jc-sb\" data-flow=\"x\"> \
<div>${priv_text}</div> \
<div data-flow=\"x\"></div> \
</div>\
`;

  if (privilege === _K.privilege.owner) {
    return html_admin;
  } else { 
    return html;
  }
};



module.exports = __desk_user_tpl;
