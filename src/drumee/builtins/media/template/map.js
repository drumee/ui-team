// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : desk/media/template/map
//   TYPE : Skelton
// ==================================================================== *

const __media_tpl_map =function(ext, d){
  const a = { 
    cnf      : "settings",
    conf     : "settings",
    css      : "raw-documents_code",
    doc      : "raw-documents_word",
    docx     : "raw-documents_word",
    htm      : "desktop__link",
    html     : "desktop__link",
    ini      : "settings",
    js       : "code-js",
    json     : "raw-json",
    md       : "raw-markdown",
    pdf      : "raw-documents_pdf", 
    ppt      : "raw-documents_powerpoint",
    pptx     : "raw-documents_powerpoint",
    rtf      : "raw-documents_word",
    schedule : "drumee-phone-cam",
    scss     : "raw-documents_code",
    settings : "settings",
    txt      : "file-txt",
    xls      : "raw-documents_excel",
    xls      : "raw-documents_excel",
    xlsx     : "raw-documents_excel",
    xlsx     : "raw-documents_excel"  
  };
  if(a[ext]){
    return a[ext];
  }
  return d || ext || "documents_different"; 
};


module.exports = __media_tpl_map;  
