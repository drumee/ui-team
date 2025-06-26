
const a = {
  urlRoot            : [],
  windowTopbar       : 44,
  ua                 : navigator.userAgent,
  logo               : `/-/images/logo/desk.jpg`,
  dialtones          : { 
    bip              : `musics/dialtones/bip.mp3`,
    busy_line        : `musics/dialtones/busy-line-std.mp3`,
    offline          : `musics/dialtones/offline-seagull.mp3`,
    rinback          : `musics/dialtones/ring-back.mp3`
  },
  ringtones          : { 
    incoming         : `musics/ringtones/piano.mp3`
  },
  notifications      : {
    std              : `musics/notifications/owl.mp3`,
    drip             : `musics/notifications/drip.mp3`
  },
  browser            : {
    width            : 504,
    height           : 396,
    minWidth         : 500,
    minHeight        : 291
  },
  projectroom        : {
    minWidth         : 688,
    minHeight        : 320
  },
  docViewer          : {
    width            : 572,
    height           : 360
  }, //window.innerHeight - 120
  char               : {
    arrow            : {
      left           : 37,
      up             : 38,
      right          : 39,
      down           : 40
    },
    blank            : ' ',
    delete           : 8,
    empty            : '',
    enter            : 13,
    escape           : 27,
    newline          : '\n',
    underscore       : '_'
  },
  ident              : {
    nobody           : 'nobody',
    cdn              : 'tunnel',
    sections_repo    : 'tunnel'
  },
  intro              : {
    video            : "/faq/intro/intro_video_2.mp4"
  },
  repo              : {
    images           : 'tunnel',
    sections         : 'world'
  },
  module             : {
    account          : "#/desk/account",
    admin            : "#/admin",   // Unstable
    desk             : "#/desk",
    sandbox          : "#/sandbox",   // Unstable
    setup            : "#/setup",
    signin           : "#/welcome/signin",
    signup           : "#/welcome/signup",
    welcome          : "#/welcome",
    welcome_intro    : "#/welcome/intro"
  },

  route              : {
    bo               : "#!bo",
    explorer         : "#!explorer",
    designer         : "#!designer",
    home             : {
      media          : "#!explorer"
    },
    logout           : "#!logout",
    private          : {
      logout         : "#!logout"
    },
    public           : {
      back           : '#!public/back',
      clear          : '#!public/clear',
      reset          : '#!public/reset',
      welcome        : '#!public/welcome'
    }
  },
  order              : {
    ascending        : 'ASC',
    descending       : 'DESC'
  },
  icon_flag          : "icons-flag icons-flag-",
  iconWidth          : 125,
  level              : {
    wrapper          : 0,    // top wrapper
    topic            : 1,    // topic object
    trigger          : 600,  // trigger object
    item             : 700,  // item object
    triggers         : 800,  // intermediate wrapper (trigger)
    items            : 900
  },  // intermediate wrapper (items)

  padding            : {
    general          : 10,
    left             : 5,
    right            : 5,
    top              : 5,
    bottom           : 5
  },
  supported_languages : ['en', 'fr', 'ru', 'zh'],

  // The remit is attached to the visitor whithin the platform scope
  // Therefore Visitor.get(_a.remit) gives the user remit on the whole platformr
  // Only staff has remit >= 2
  remit              : {
    root             : 0x4,
    spacesAdmin      : 0x3,
    usersAdmin       : 0x2,
    hubsAdmin        : 0x1,
    sitesAdmin       : 0x1
  },

  // The privilege is attached to the visitor whithin the site scope
  // Therefore Host.get(_a.privilege) gives the user privilege whithin the site
  // Privilege is the bit block that contains all the privilege 
  // The privilege is attached to the visitor whithin the hub scope
  // Therefore Host.get(_a.privilege) gives the user privilege whithin the site
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

  pagelength : 45,
    //aliases
  quandl: {
    url              : `${protocol}://www.quandl.com/api/v1/datasets/`,
    token            : "sort_order=asc&auth_token=JJjZDx1ie8ccsocbDeAz"
  },
  string             : {
    empty            : '',
    zero             : '0',
    one              : '1'
  },
  path               : {
    bg               : 'images/backgrounds/',
    jpicker          : 'static/-/images/jpicker/',
    skins            : 'skins/kreature-media/',
    thumb            : 'static/img/icons/thumbnails'
  },
  icon               : {
    smiley           : 'static/img/bg/drumee-smiley.png',
    site             : "static/-/images/drumee/img/defaut-site@3x.png"
  },
  picto              : {
    folder           : 'static/img/pictos/folder.png',
    twitter          : 'static/img/pictos/feed-twitter.png',
    rss              : 'static/img/pictos/rss.png'
  },
  profile            : {
    M                : 'static/img/def-profiles/profile-M.jpg',
    F                : 'static/img/def-profiles/profile-F.jpg',
    X                : 'static/img/def-profiles/profile-M.jpg'
  },
  format             : {
    card             : 'card',
    vignette         : 'vignette',
    icon             : 'icon',
    thumb            : 'thumb',
    theme            : 'theme',
    slide            : 'slide',
    player           : 'player',
    orig             : 'orig'
  },
  defaults           : {
    lang             : 'fr',
    bg               : 'images/backgrounds/default-bg.jpg',
    wp               : `${protocol}://images.drumee.name/-/images/drumee/editor/desk-bg.png`,
    slide            : 'images/backgrounds/transparent.png',
    date_format      : "DD MMM YYYY", //"DD.MM.YY"
    ease             : 'Back.easeOut',
    imageSize        : {
      width          : 504, //500
      height         : 504
    }, //500
    topbar           : {
      desk           : {      
        regular_top     : 80,
        main_top        : 145
      }
    }
  }, // 80 regular_height + 45 margin top + 20 margin-bottom
  fullSize           : "100%",
  position           : {
    offscreen        : "-1000px",
    center           : "50% 50%"
  },
  size               : {
    full             : "100%",
    half             : "50%",
    zero             : "0",
    px5              : "5px",
    px10             : "10px",
    px20             : "20px",
    px30             : "30px",
    px40             : "40px",
    px50             : "50px",
    px100            : "100px",
    px140            : "140px",
    px150            : "150px",
    px200            : "200px",
    px200            : "200px",
    px500            : "500px",
    px800            : "800px",
    geometry         : {}
  },
  color              : {
    black            : "black",
    blue             : "blue",
    ink              : "333",
    red              : "red",
    white            : "white"
  },
  rgba               : {
    black            : "rgba(0, 0, 0, 1)",
    white            : "rgba(255, 255, 255, 1)"
  },
  allowed_tag        : ['p','a', 'br', 'b','u','i','ul','li','quote','span','div', 'svg', 'use', 'del', 'ins', 'h'],
  tag                : {
    a                : "a",
    br               : "<br/>",
    div              : "div",
    h1               : "h1",
    h2               : "h2",
    h3               : "h3",
    h4               : "h4",
    h5               : "h5",
    h6               : "h6",
    h7               : "h7",
    iframe           : "iframe",
    img              : "img",
    li               : "li",
    ol               : "ol",
    p                : "p",
    span             : "span",
    svg              : "svg",
    ul               : "ul"
  },
  dummyArgs          : {},
  windowWidth        : {
    medium           : 991
  },
  z_index            : {
    lowest           : -100,
    lower            : -10,
    low              : -1,
    high             : 1000,
    higher           : 10000,
    highest          : 100000
  },
  
  imagePlayer        : {
    width            : 125 * 5,
    height           : 125 * 4
  }
};

module.exports = a;
