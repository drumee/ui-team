/**
 * 
 */
function load_core() {
  console.log(`Loading Core...`, document.readyState);
  window.Preset = {
    Button: require('libs/preset/button'),
    ConfirmButtons: require('libs/preset/confirm-buttons'),
    List: require('libs/preset/list-stream'),
    Utils: require('libs/preset/utils')
  };

  window.Template = require('libs/preset/template');
  window.Skeletons = require('toolkit/skeletons');
  window.Websocket = null;

  window.Validator = require('core/utils/validator');
  window.Kind = require("core/kind");
  window.pointerDragged = false;
  window.LetcBlank = require("libs/reader/blank");
  window.LetcBox = require("libs/reader/box");
  window.LetcList = require("libs/reader/list/smart");
  window.LetcText = require("libs/reader/text");

  window.Platform = new Backbone.Model();
  window.Env = new Backbone.Model();
  window.Host = require('./host')();
  window.Visitor = require('./user')();
  window.Organization = require('./organization')();
  window.DrumeeMFS = require('./mfs');
  const event = new Event('drumee:bootstraping');
  event.name = 'core'
  document.dispatchEvent(event);
  document.removeEventListener('drumee:bootstraping', core_loader)
}

/**
 * 
 * @param {*} e 
 */
function core_loader(e) {
  if (e.name == 'locale') {
    require("lodash");
    window.jQuery = require("jquery");
    window.$ = window.jQuery;
    window.Marionette = require("backbone.marionette");
    require("jquery-ui/ui/widgets/droppable");
    require("jquery-ui/ui/widgets/resizable");
    require('./addons');
    if (document.readyState == 'complete') {
      load_core()
    } else {
      document.addEventListener('readystatechange', () => {
        if (document.readyState == 'complete') { load_core() }
      }, false);
    }
  }
}

document.addEventListener('drumee:bootstraping', core_loader)

