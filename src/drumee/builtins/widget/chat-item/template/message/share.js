// ==================================================================== *
//   Copyright Xialia.com  2011-2021
//   FILE : /src/drumee/builtins/media/row/template/filename.coffee
//   TYPE : Skeleton
// ==================================================================== *

const __media_filename = function(m) {
  let edit;
  const {
    filename
  } = m;

  if ((m.isAttachment) || (Visitor.inDmz) || (m.isalink && (m.area !== _a.share)) || (m.status === _a.deleted)) { 
    edit = "";
  } else { 
    edit = `\
<div id=\"${m._id}-edit\" data-service=\"rename\" class=\"edit\"> \
<svg id=\"${m._id}-edit-icon\" class=\"full edit icon \"> \
${Template.Xmlns('desktop_sharebox_edit')} \
</svg> \
<div id=\"${m._id}-commit-edit\" class=\"full edit ok-button \" style=\"{'display': 'none'}\"> \
Ok \
</div> \
</div>\
`;
  }

  const html = `\
<div id=\"${m._id}-filename\" class=\"filename\"> \
${filename} \
</div> \
${edit}\
`;
  return html;
};

module.exports = __media_filename;