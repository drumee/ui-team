// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/lex/constants
//   TYPE :
// ==================================================================== *

const a = {
  urlRoot            : [],
  dialtones          : { 
    bip              : "/_/static/musics/dialtones/bip.mp3",
    busy_line        : "/_/static/musics/dialtones/busy-line-std.mp3",
    offline          : "/_/static/musics/dialtones/offline-seagull.mp3",
    rinback          : "/_/static/musics/dialtones/ring-back.mp3"
  },
  ringtones          : { 
    incoming         : "/_/static/musics/ringtones/piano.mp3"
  },
  notifications      : {
    std              : "/_/static/musics/notifications/owl.mp3",
    drip             : "/_/static/musics/notifications/drip.mp3"
  },
  intro              : {
    video            : "/faq/intro/intro_video_2.mp4"
  },
  supported_languages : ['en', 'fr', 'ru', 'zh'],
  nobody             : 'ffffffffffffffff',
  // The remit is attached to the visitor whithin the plateform scope
  // Therefore Visitor.get(_a.remit) gives the user remit on the whole plateformr
  // Only staff has remit >= 2
  remit              : {
    root             : 0x4,
    spacesAdmin      : 0x3,
    usersAdmin       : 0x2,
    hubsAdmin        : 0x1,
    sitesAdmin       : 0x1
  },

  // The privilege is attached to the visitor whithin the site scope
  // Therefore Site.get(_a.privilege) gives the user privilege whithin the site
  // Privilege is the bit block that contains all the privilege 
  // The privilege is attached to the visitor whithin the hub scope
  // Therefore Site.get(_a.privilege) gives the user privilege whithin the site
  privilege          : {
    owner            : 0b0111111, // 127
    admin            : 0b0011111, // 
    delete           : 0b0001111, //
    write            : 0b0000111, //
    read             : 0b0000011, //
    anonymous        : 0b0000001, //
    //aliases
    modify           : 0b0001111, // delete
    upload           : 0b0000111, // write
    view             : 0b0000011, // read
    download         : 0b0000011, // read
    guest            : 0b0000001, // read 
    //aliases - domain 
    admin_security   : 0b0001111, //
    admin_member    : 0b0000111, //
    admin_view      : 0b0000011, //
    member          : 0b0000001
  }, //

  // Permission is a particular the right required a execute a particule service 
  // It's a particular among the ones that compose the privilege word 
  // The resquested service shall only be executude if logical operation
  // privilege&permission > 0
  permission          : {
    owner            : 0b0100000, // 127
    admin            : 0b0010000, // 
    delete           : 0b0001000, //
    write            : 0b0000100, //
    read             : 0b0000010, //
    anonymous        : 0b0000001, //
    //aliases
    modify           : 0b0001000, // delete
    upload           : 0b0000100, // write
    view             : 0b0000010, // read
    download         : 0b0000010, // read
    guest            : 0b0000001, // read 

    //aliases - domain
    admin_security   : 0b0001000, //
    admin_member    : 0b0000100, //
    admin_view       : 0b0000010, // 
    member           : 0b0000001
  }, // 

 
};

module.exports = a;
