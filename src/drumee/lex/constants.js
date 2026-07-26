
const a = {
  urlRoot: [],
  windowTopbar: 132,
  ua: navigator.userAgent,
  logo: `/-/images/logo/desk.jpg`,
  dialtones: {
    bip: `musics/dialtones/bip.mp3`,
    busy_line: `musics/dialtones/busy-line-std.mp3`,
    offline: `musics/dialtones/offline-seagull.mp3`,
    rinback: `musics/dialtones/ring-back.mp3`
  },
  ringtones: {
    incoming: `musics/ringtones/piano.mp3`
  },
  notifications: {
    std: `musics/notifications/owl.mp3`,
    drip: `musics/notifications/drip.mp3`
  },
  docViewer: {
    width: 750,
    height: 600
  }, 
  char: {
    arrow: {
      left: 37,
      up: 38,
      right: 39,
      down: 40
    },
    blank: ' ',
    delete: 8,
    empty: '',
    enter: 13,
    escape: 27,
    newline: '\n',
    underscore: '_'
  },
  ident: {
    nobody: 'nobody',
    cdn: 'tunnel',
    sections_repo: 'tunnel'
  },
  // dataTransfer tag set by widgets running their own native HTML5 drag; Wm
  // skips its file-drop targeting pass for those (manager.js _isInternalDrag).
  internalDragType: 'application/x-drumee-internal',
  module: {
    account: "#/desk/account",
    admin: "#/admin",   // Unstable
    desk: "#/desk",
    sandbox: "#/sandbox",   // Unstable
    setup: "#/setup",
    signin: "#/welcome/signin",
    signup: "#/welcome/signup",
    welcome: "#/welcome",
    welcome_intro: "#/welcome/intro"
  },

  order: {
    ascending: 'ASC',
    descending: 'DESC'
  },
  iconWidth: 125,
  level: {
    wrapper: 0,    // top wrapper
    topic: 1,    // topic object
    trigger: 600,  // trigger object
    item: 700,  // item object
    triggers: 800,  // intermediate wrapper (trigger)
    items: 900
  },  // intermediate wrapper (items)


  // The remit is attached to the visitor whithin the platform scope
  // Therefore Visitor.get(_a.remit) gives the user remit on the whole platformr
  // Only staff has remit >= 2
  remit: {
    root: 0x4,
    spacesAdmin: 0x3,
    usersAdmin: 0x2,
    hubsAdmin: 0x1,
    sitesAdmin: 0x1
  },

  // The privilege is attached to the visitor whithin the site scope
  // Therefore Host.get(_a.privilege) gives the user privilege whithin the site
  // Privilege is the bit block that contains all the privilege 
  // The privilege is attached to the visitor whithin the hub scope
  // Therefore Host.get(_a.privilege) gives the user privilege whithin the site
  privilege: {
    owner            : 0b0111111, 
    admin            : 0b0011111, 
    delete           : 0b0001111,
    write            : 0b0001111,
    modify           : 0b0001111,
    upload           : 0b0001111,
    get              : 0b0000111,
    download         : 0b0000111,
    chat             : 0b0000111,
    read             : 0b0000011,
    view             : 0b0000011,
    anonymous        : 0b0000001,
    anyone           : 0b0000001,
    guest            : 0b0000001, 

    //aliases - domain 
    admin_security   : 0b0001111, 
    admin_member     : 0b0000111, 
    admin_view       : 0b0000011, 
    member           : 0b0000001
  }, //

  // Permission is a particular the right required a execute a particule service 
  // It's a particular among the ones that compose the privilege word 
  // The resquested service shall only be executude if logical operation
  // privilege&permission > 0
  permission: {
    owner              : 0b0100000, 
    admin              : 0b0010000, 
    delete             : 0b0001000,
    write              : 0b0001000,
    modify             : 0b0001000,
    upload             : 0b0001000,
    get                : 0b0000100,
    download           : 0b0000100,
    chat               : 0b0000110,
    read               : 0b0000010,
    view               : 0b0000010,
    anonymous          : 0b0000001,
    anyone             : 0b0000001,
    guest              : 0b0000001, 

    //aliases - domain
    admin_security     : 0b0001000, 
    admin_member       : 0b0000100, 
    admin_view         : 0b0000010,
    member             : 0b0000001
  }, // 

  pagelength: 45,
  //aliases
  string: {
    empty: '',
    zero: '0',
    one: '1'
  },
  fullSize: "100%",
  size: {
    full: "100%",
    half: "50%",
    zero: "0",
    px5: "5px",
    px10: "10px",
    px20: "20px",
    px30: "30px",
    px40: "40px",
    px50: "50px",
    px100: "100px",
    px140: "140px",
    px150: "150px",
    px200: "200px",
    px200: "200px",
  },
  allowed_tag: ['p', 'a', 'br', 'b', 'u', 'i', 'ul', 'li', 'quote', 'span', 'div', 'svg', 'use', 'del', 'ins', 'h'],
  tag: {
    a: "a",
    br: "<br/>",
    div: "div",
    h1: "h1",
    h2: "h2",
    h3: "h3",
    h4: "h4",
    h5: "h5",
    h6: "h6",
    h7: "h7",
    iframe: "iframe",
    img: "img",
    li: "li",
    ol: "ol",
    p: "p",
    span: "span",
    svg: "svg",
    ul: "ul"
  },
  dummyArgs: {},

  imagePlayer: {
    width: 125 * 5,
    height: 125 * 4
  }
};

module.exports = a;
