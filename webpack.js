const webpack = require('webpack');
const TerserPlugin = require('terser-webpack-plugin');
const { join } = require('path');
const Resolve = require('./webpack/resolve');
const Module = require('./webpack/module');
const Plugins = require('./webpack/plugins');

const {
  BUILD_TARGET,
  ENDPOINT,
  OUTPUT_FILENAME,
  PUBLIC_PATH,
  UI_BUILD_MODE,
  UI_BUILD_PATH,
  UI_SRC_PATH,
  USER,
} = process.env;

/**
 * 
 * @param {*} entry 
 * @param {*} opt 
 * @returns 
 */
function makeOptions(entry, opt) {

  let output = {
    path: opt.bundle_path,
    publicPath: opt.public_path,
    filename: "[name]-[chunkhash].js",
    clean: true,
  };

  console.group(`BUNDLING target **${opt.target}**`);
  console.log(`::::: WITH :::: `, { entry, output, opt });

  const res = {
    mode: opt.mode || 'development',
    target: 'web', // Ensure you're targeting web
    entry,
    output,
    experiments: {
      asyncWebAssembly: true,
      topLevelAwait: true,
    },
    resolve: Resolve(__dirname),
    plugins: Plugins(webpack, opt),
    module: Module(__dirname, opt.mode),
    node: {
      __filename: true
    },
    stats: {
      assets: true,
      modules: true,
      orphanModules: true,
    },
    context: __dirname,

    optimization: {
      splitChunks: {
        minSize: 20000, // Minimum size for a chunk to be generated
      },
      runtimeChunk: 'single', // Extracts webpack runtime code into a separate file (e.g., runtime~main.[hash].js)
      moduleIds: 'deterministic', // (Webpack 5+) Stable module IDs
      chunkIds: 'deterministic', // (Webpack 5+) Stable chunk IDs
    },
  };

  if (['production'].includes(opt.mode)) {
    res.optimization.minimize = true;
    res.optimization.minimizer = [
      new TerserPlugin({
        test: /\.js(\?.*)?$/i,
        terserOptions: {
          ecma: undefined,
          warnings: false,
          parse: {},
          compress: {},
          mangle: true, // Do not change
          module: false,
          output: null,
          toplevel: false,
          nameCache: null,
          ie8: false,
          keep_classnames: true,
          keep_fnames: true,
          safari10: false,
        },
      })
    ]
  }
  return res;
}

/**
 * 
 * @returns 
 */
function normalize() {

  let bundle_base = UI_BUILD_PATH;
  if (!bundle_base) {
    bundle_base = UI_RUNTIME_PATH;
  }

  if (!bundle_base) {
    throw "Either UI_RUNTIME_PATH or UI_BUILD_PATH must be set";
  }

  let endpointName = ENDPOINT || USER;
  if (!BUILD_TARGET) BUILD_TARGET = 'app';
  let target = BUILD_TARGET;
  let public_path = `/-/${endpointName}/${target}/`;
  if (ENDPOINT == 'main') {
    public_path = `/-/${target}/`;
  }
  if (PUBLIC_PATH) public_path = PUBLIC_PATH;

  const mode = UI_BUILD_MODE || 'development';
  let bundle_path = join(bundle_base, target);
  let opt = {
    bundle_base,
    bundle_path,
    public_path,
    target,
    mode,
  };
  if (OUTPUT_FILENAME == "[name].js") {
    opt.no_hash = 1;
  }
  console.log({ opt, BUILD_TARGET })
  return opt;
}


module.exports = function () {
  const opt = normalize();
  switch (BUILD_TARGET) {
    case 'app':
      let main = join(UI_SRC_PATH, 'src', 'drumee', 'index.web');
      let locale = join(UI_SRC_PATH, 'locale');
      let sprite = join(UI_SRC_PATH, 'src', 'sprite');
      let vendor = join(UI_SRC_PATH, 'src', 'vendor');
      let core = join(UI_SRC_PATH, 'src', 'core');
      return makeOptions({ core, main, locale, sprite, vendor }, opt);
    default:
      console.error(`The build target ${BUILD_TARGET} was unexpected`)
  }
}
