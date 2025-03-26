// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : src/drumee/builtins/desk/skeleton/main
//   TYPE : 
// ==================================================================== *

const __hub = function(opt){
  let a = 'window_folder';
  if (opt.extension === 'root') {
    const x = { 
      private     : 'window_team',
      share       : 'window_share',
      public      : 'window_website'
    };

    a = x[opt.area] || 'window_folder';
  }

  return a;
};

const __wm_applications = function(opt){
  const type = opt.type || opt.filetype;
  const w = { 
    'address-book'    : 'window_addressbook',
    'audio'           : 'audio_player',
    'channel'         : 'window_channel',
    'connect'         : 'window_connect',
    'contact'         : 'window_contact',
    'document'        : 'document_reader',
    'error'           : 'window_info',
    'folder'          : __hub(opt),
    'hub'             : __hub(opt),
    'image'           : 'image_viewer',
    'info'            : 'window_info',
    'meeting'         : 'window_meeting',
    'script'          : 'window_launcher',
    'vector'          : 'vector_viewer',
    'video'           : 'video_viewer',
    'web'             : 'window_launcher',
    'webrtc'          : 'window_webrtc'
  };
  if (w[type]) {
    opt.kind = w[type];
    return opt;
  }
  
  return {kind : 'window_info', message : LOCALE.NO_VIEWER};
};


module.exports = __wm_applications;
