
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
  
  // locale/index.js stopped exporting a selector function when the entries
  // were split into separate bundles (commit 2eeeb731) — require("locale")(l)
  // has thrown TypeError ever since, killing everything below this line on
  // the embed arch. locale/lang is the replacement: it resolves the explicit
  // in-app choice (English unless one was made) and hands back the matching
  // table, so an embedded widget renders in the same language as the desk
  // app that set it, instead of being pinned to English.
  const lang = require("locale/lang");
  lang.install(lang.current());

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