const __media_tpl_info = function (m) {
  let size;
  switch (m.ext) {
    case "special":
      var ext = "folder";
      break;
    case _a.public:
      ext = "hub";
      break;
    case _a.private:
      ext = "share room";
      break;
    default:
      ({
        ext
      } = m);
  }
  if ([_a.hub, _a.folder].includes(m.filetype)) {
    size = '--';
  } else {
    size = m.size || m.filesize;
  }
  if(!m.date){
    m.date = Dayjs.unix(m.ctime).fromNow()
    console.trace()
  }
  const html = `\
<div id=\"${m._id}-access-date\" class=\"${m.fig.family}__field-date\">${m.date}</div> \
<div id=\"${m._id}-size\" class=\"${m.fig.family}__field-size\">${size}</div> \
<div id=\"${m._id}-type\" class=\"${m.fig.family}__field-type\">${m.ext}</div>\
`;
  //    <div id=\"#{media._id}-type\" class=\"file-info type\">#{ext}</div>
  return html;
};

module.exports = __media_tpl_info;    
