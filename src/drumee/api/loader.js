
const { Region } = Marionette;

function __parse() {
  let nodes = document.getElementsByClassName('drumee-api');
  let res = [];
  for (let el of nodes) {
    let options = {};
    for (let k of el.attributes) {
      let name = k.name.replace(/^data-/, '');
      options[name] = k.value;
    }
    res.push({ el, options });
  }
  return res;
}

/**
 * 
 */
function loadSprites() {
  function create_el(content) {
    const el = document.createElement(_K.tag.div);
    el.style = "display:none !important";
    el.style.cssText = "display:none !important";
    el.innerHTML = content;
    document.body.insertBefore(el, document.body.childNodes[0]);
  }

  let normalized = require('../../../bb-templates/svg/normalized.sprite.txt').default;
  create_el(normalized);
}


function initialize() {
  Kind.export_builtins('drumee');
  let user = {
    id: "ffffffffffffffff",
    ident: "nobody",
    username: "nobody",
    lang: null,
    profile: {},
    settings: {},
    disk_usage: null,
    quota: {},
    firstname: "Anonymous",
    lastname: "User",
  };

  window.Visitor = require('core/user')(user);
  
  let l = Visitor.pagelang();

  if (!['en', 'fr', 'ru', 'zh'].includes(l)) l = 'en';

  window.LOCALE = require("locale")(l);

  let nodes = __parse();
  for (let node of nodes) {
    //console.log("AAA:63", node);
    let region = new Region({ el: node.el });
    let box = new drumeeBox({ kids: [node.options] });
    region.show(box);
  }
  loadSprites();
}



function __api_load() {
  if(Kind.isReady()){
    return initialize();
  }
  Kind.once(_e.ready, () => {
    initialize();
  })
}
export default __api_load();