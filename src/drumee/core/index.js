

require('./addons');

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
