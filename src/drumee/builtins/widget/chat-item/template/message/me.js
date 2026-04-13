module.exports = function(m) {
  let edit;

  if ((m.isAttachment) || (Visitor.inDmz) || (m.isalink && (m.area !== _a.share)) || (m.status === _a.deleted)) { 
    edit = "";
  } else { 
    edit = 
    `<div id="${m._id}-edit" data-service="rename" class="edit"> 
      <svg id="${m._id}-edit-icon" class="full edit icon ">${Template.Xmlns('desktop_sharebox_edit')}</svg> 
      <div id="${m._id}-commit-edit" class="full edit ok-button " style="{'display': 'none'}">Ok</div> 
    </div>`;
  }

  return `<div id="${m._id}-filename" class="filename">${m.filename}</div>${edit}`;
};