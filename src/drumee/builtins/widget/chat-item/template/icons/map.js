// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : desk/media/template/map
//   TYPE : Skelton
// ==================================================================== *

const __media_tpl_map =function(ext, d){
  const a = { 
    pdf      : "raw-documents_pdf", //"file-pdf"
    pptx     : "raw-documents_powerpoint",
    ppt      : "raw-documents_powerpoint",
    xlsx     : "raw-documents_excel",
    xls      : "raw-documents_excel",
    docx     : "raw-documents_word",
    doc      : "raw-documents_word",
    css      : "raw-documents_code",
    scss     : "raw-documents_code",
    html     : "desktop__link",
    js       : "code-js",
    schedule : "drumee-phone-cam",
    settings : "settings",
    ini      : "settings",
    conf     : "settings",
    cnf      : "settings"
  };
  const r = a[ext] || d || "documents_different"; 
  return r;
};


module.exports = __media_tpl_map;  
