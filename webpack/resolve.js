const { resolve } = require("path");

const src_dir = 'src';
const drumee_path = 'src/drumee/';
const vendor_path = 'src/vendor/';
const libs = drumee_path + 'libs/';
const builtins = drumee_path + 'builtins/';
const utils = drumee_path + 'utils/';
const node_path = 'node_modules';
const drumee_modules = drumee_path + 'modules/';
const ui_core = node_path + '/@drumee/ui-core/letc';
const ui_styles = node_path + '/@drumee/ui-styles/src';

// Local overrides for skin — files that diverge from @drumee/ui-styles.
// `skin/mixins` (prefix, no $) covers the entire mixins/ subtree which has
// no equivalent in the package.
const skin_overrides = {
  'skin$':                     'skin/index',
  'skin/index$':               'skin/index',
  'skin/lib/align$':           'skin/lib/align',
  'skin/lib/button$':          'skin/lib/button',
  'skin/lib/container$':       'skin/lib/container',
  'skin/lib/drumee-buttons$':  'skin/lib/drumee-buttons',
  'skin/lib/input$':           'skin/lib/input',
  'skin/lib/typo$':            'skin/lib/typo',
  'skin/lib/utils$':           'skin/lib/utils',
  'skin/vars/bigchat$':        'skin/vars/bigchat',
  'skin/vars/box-shadow$':     'skin/vars/box-shadow',
  'skin/vars/color$':          'skin/vars/color',
  'skin/vars/default$':        'skin/vars/default',
  'skin/vars/revamp$':         'skin/vars/revamp',
  'skin/mixins':               'skin/mixins',   // prefix — whole subtree is local-only
};

function resolveLocalOverrides(basedir, map, base) {
  return Object.fromEntries(
    Object.entries(map).map(([alias, rel]) => [alias, resolve(basedir, drumee_path, rel)])
  );
}

module.exports = function (basedir) {
  if (!basedir) {
    basedir = resolve(__dirname, '..')
  }
  return {
    extensions: [".coffee", ".js", ".scss", ".css", ".web.coffee", ".web.js", ".json", ".tpl", '.tsx', '.ts',],
    alias: {
      ...resolveLocalOverrides(basedir, skin_overrides),

      env: resolve(node_path, '@embedpdf/pdfium/dist/pdfium.wasm'),
      wasi_snapshot_preview1: resolve(node_path, '@embedpdf/pdfium/dist/pdfium.wasm'),
      api: resolve(basedir, drumee_path, 'api'),
      application: resolve(basedir, drumee_path, 'core'),
      assets: resolve(basedir, drumee_path, 'assets'),
      animejs: resolve(node_path, 'animejs'),
      behavior: resolve(node_path, '@drumee/ui-core/letc/addons/backbone/view/behavior'),
      blank: resolve(basedir, libs, 'reader', 'blank'),
      builder: resolve(basedir, drumee_modules, 'builder'),
      builtins: resolve(basedir, builtins),
      ccc: resolve(basedir, builtins, 'window', '_ccc'),
      code: resolve(basedir, drumee_modules, 'code'),
      confs: resolve(basedir, drumee_path, 'confs'),
      core: resolve(basedir, drumee_path, 'core'),
      creator: resolve(basedir, drumee_modules, 'creator'),
      cropperjs: resolve(node_path, 'cropperjs'),
      dataset: resolve(basedir, 'dataset'),
      dayjs: resolve(basedir, node_path, 'dayjs'),
      dede: resolve(basedir, drumee_modules, 'dede'),
      designer: resolve(basedir, libs, 'designer'),
      desk: resolve(basedir, drumee_modules, 'desk'),
      dmz: resolve(basedir, drumee_modules, 'dmz'),
      drive: resolve(basedir, drumee_modules, 'drive'),
      electron: resolve(basedir, src_dir, 'electron'),
      editor: resolve(basedir, builtins, 'editor'),
      explorer: resolve(basedir, drumee_modules, 'explorer'),
      helper: resolve(basedir, drumee_modules, 'designer', 'skeleton', 'helper'),
      hub: resolve(basedir, drumee_modules, 'hub'),
      invitation: resolve(basedir, drumee_path, 'builtins', 'widget', 'invitation'),
      // Force a single jQuery instance across the app and its libraries.
      // @drumee/ui-core ships jQuery 4.0.0 nested in its own node_modules,
      // while jquery-ui 1.14.2 (used here for the mouse widget that
      // jquery-ui-touch-punch depends on) requires jQuery 3.x. Without
      // this alias, ui-core registers $.widget against its v4 copy where
      // it silently fails to register $.ui.mouse, then touch-punch reads
      // $.ui.mouse.prototype on the same window.jQuery and throws.
      jquery$: resolve(basedir, node_path, 'jquery'),
      jquery_ui_custom: resolve(basedir, vendor_path, 'jquery-ui-1.12.1.custom'),
      lex: resolve(basedir, drumee_path, 'lex'),
      libs: resolve(basedir, drumee_path, 'libs'),
      locale: resolve(basedir, 'locale'),
      // Cherry-picked lodash shim — only the ~40 functions actually used.
      // Reduces the full 533 KB bundle to ~55 KB.
      lodash: resolve(basedir, libs, 'lodash'),
      // marionette: 'backbone.marionette',
      media: resolve(basedir, builtins, 'media'),
      menus: resolve(basedir, libs, 'skeleton', 'menus'),
      mixins: resolve(basedir, drumee_path, 'skin', 'mixins'),
      modules: resolve(basedir, drumee_modules),
      moment: resolve(node_path, 'moment'),
      options: resolve(basedir, utils, 'options'),
      player: resolve(basedir, builtins, 'player'),
      popup: resolve(basedir, builtins, 'widget', 'popup'),
      proxy: resolve(basedir, drumee_path, 'core', 'proxy'),
      reader: resolve(basedir, libs, 'reader'),
      respawn: resolve(basedir, builtins, 'designer', 'skeleton', 'respawn'),
      router: resolve(basedir, drumee_path, 'router'),
      sass: resolve(basedir, src_dir, 'sass'),
      skeleton: resolve(basedir, libs, 'skeleton'),
      skin: resolve(node_path, ui_styles),
      slider: resolve(basedir, drumee_modules, 'slider'),
      slurper: resolve(basedir, drumee_modules, 'slurper'),
      src: resolve(basedir, src_dir),
      test: resolve(basedir, utils, 'test'),
      toolbox: resolve(basedir, drumee_modules, 'designer', 'skeleton', 'toolbox'),
      toolkit: resolve(node_path, ui_core, 'toolkit'),
      type: resolve(basedir, libs, 'type'),
      vendor: resolve(basedir, src_dir, 'vendor'),
      welcome: resolve(basedir, drumee_modules, 'welcome'),
      widget: resolve(basedir, builtins, 'widget'),
      window: resolve(basedir, builtins, 'window'),
      workspace: resolve(basedir, drumee_modules, 'creator', 'skeleton', 'workspace'),
      wrapper: resolve(basedir, libs, 'reader', 'element'),
    },
  }
};
