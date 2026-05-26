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
  let date = Dayjs.unix(m.mtime || m.ctime).format(Visitor.dateformat());
  const html = `
  <div id="${m._id}-access-date" class="${m.fig.family}__field-date">${date}</div>
  <div id="${m._id}-size" class="${m.fig.family}__field-size">${size}</div> 
  <div id="${m._id}-type" class="${m.fig.family}__field-type">${m.ext}</div>
`;
  return html;
};

module.exports = __media_tpl_info;    
