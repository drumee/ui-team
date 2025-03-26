const { resolve } = require("path");

const src_dir = 'src';
const drumee_path = 'src/drumee/';
const vendor_path = 'src/vendor/';
const libs = drumee_path + 'libs/';
const builtins = drumee_path + 'builtins/';
const utils = drumee_path + 'utils/';
const node_path = 'node_modules';
const drumee_modules = drumee_path + 'modules/';

module.exports = function (basedir) {
  return {
    extensions: [".coffee", ".js", ".scss", ".css", ".web.coffee", ".web.js", ".json", ".tpl", '.tsx', '.ts',],
    alias: {
      'api': resolve(basedir, drumee_path, 'api'),
      'application': resolve(basedir, drumee_path, 'core'),
      'assets': resolve(basedir, drumee_path, 'assets'),
      'backbone.radio': resolve(node_path, 'backbone.radio'),
      'backbone$': resolve(node_path, 'backbone'),
      'bb-templates': resolve(basedir, 'bb-templates'),
      'behavior': resolve(basedir, drumee_path, 'behavior'),
      'blank': resolve(basedir, libs, 'reader', 'blank'),
      'builder': resolve(basedir, drumee_modules, 'builder'),
      'builtins': resolve(basedir, builtins),
      'ccc': resolve(basedir, builtins, 'window', '_ccc'),
      'code': resolve(basedir, drumee_modules, 'code'),
      'confs': resolve(basedir, drumee_path, 'confs'),
      'core': resolve(basedir, drumee_path, 'core'),
      'creator': resolve(basedir, drumee_modules, 'creator'),
      'cropperjs': resolve(node_path, 'cropperjs'),
      'dataset': resolve(basedir, 'dataset'),
      'dayjs': resolve(basedir, node_path, 'dayjs'),
      'dede': resolve(basedir, drumee_modules, 'dede'),
      'designer': resolve(basedir, libs, 'designer'),
      'desk': resolve(basedir, drumee_modules, 'desk'),
      'dmz': resolve(basedir, drumee_modules, 'dmz'),
      'drive': resolve(basedir, drumee_modules, 'drive'),
      'electron': resolve(basedir, src_dir, 'electron'),
      'editor': resolve(basedir, builtins, 'editor'),
      'explorer': resolve(basedir, drumee_modules, 'explorer'),
      'helper': resolve(basedir, drumee_modules, 'designer', 'skeleton', 'helper'),
      'hub': resolve(basedir, drumee_modules, 'hub'),
      'invitation': resolve(basedir, drumee_path, 'builtins', 'widget', 'invitation'),
      'jquery_ui_custom': resolve(basedir, vendor_path, 'jquery-ui-1.12.1.custom'),
      'jitsi': resolve(basedir, vendor_path, 'lib-jitsi-meet/dist/umd'),
      'lex': resolve(basedir, drumee_path, 'lex'),
      'libs': resolve(basedir, drumee_path, 'libs'),
      'locale': resolve(basedir, 'locale'),
      'marionette': 'backbone.marionette',
      'media': resolve(basedir, builtins, 'media'),
      'menus': resolve(basedir, libs, 'skeleton', 'menus'),
      'mixins': resolve(basedir, drumee_path, 'skin', 'mixins'),
      'modules': resolve(basedir, drumee_modules),
      'moment': resolve(node_path, 'moment'),
      'options': resolve(basedir, utils, 'options'),
      'player': resolve(basedir, builtins, 'player'),
      'popup': resolve(basedir, builtins, 'widget', 'popup'),
      'proxy': resolve(basedir, drumee_path, 'core', 'proxy'),
      'reader': resolve(basedir, libs, 'reader'),
      'respawn': resolve(basedir, builtins, 'designer', 'skeleton', 'respawn'),
      'router': resolve(basedir, drumee_path, 'router'),
      'sass': resolve(basedir, src_dir, 'sass'),
      'skeleton': resolve(basedir, libs, 'skeleton'),
      'skin': resolve(basedir, drumee_path, 'skin'),
      'slider': resolve(basedir, drumee_modules, 'slider'),
      'slurper': resolve(basedir, drumee_modules, 'slurper'),
      'src': resolve(basedir, src_dir),
      'templates': resolve(basedir, 'templates'),
      'test': resolve(basedir, utils, 'test'),
      'toolbox': resolve(basedir, drumee_modules, 'designer', 'skeleton', 'toolbox'),
      'toolkit': resolve(basedir, drumee_path, 'toolkit'),
      'type': resolve(basedir, libs, 'type'),
      'utils': resolve(basedir, drumee_path, 'utils'),
      'vendor': resolve(basedir, src_dir, 'vendor'),
      'welcome': resolve(basedir, drumee_modules, 'welcome'),
      'widget': resolve(basedir, builtins, 'widget'),
      'window': resolve(basedir, builtins, 'window'),
      'workspace': resolve(basedir, drumee_modules, 'creator', 'skeleton', 'workspace'),
      'wrapper': resolve(basedir, libs, 'reader', 'element'),
    },
  }
};
