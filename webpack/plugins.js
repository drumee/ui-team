
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { DuplicatesPlugin } = require("inspectpack/plugin");
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const { WebpackManifestPlugin } = require('webpack-manifest-plugin');
const { StatsWriterPlugin } = require("webpack-stats-plugin");
const CopyPlugin = require('copy-webpack-plugin');

const { join, dirname } = require('path')
const Sync = require('./sync');

// MediaPipe Selfie Segmentation ships its wasm/model/loader files as siblings
// that its runtime fetches by name via locateFile(). Bundling can't inline
// them, so copy them next to the bundle (served at `${publicPath}mediapipe/`)
// and point the background-blur effect's locateFile there.
const mediapipeDir = dirname(
  require.resolve('@mediapipe/selfie_segmentation/package.json')
);


const { exec } = require("shelljs");
const { stdout } = exec("git log -1 --pretty=format:'%h:%H' --abbrev-commit", { silent: true });
let [short] = stdout.split(':');
const { version } = require('../package.json');

module.exports = function (webpack, opt) {
  let mode = opt.mode || 'developement';
  let templates = opt.temlates_path || '';
  const pluginsOptions = {
    __TEMPLATES__: `"${templates}"`,
    __BUILD__: `"${mode}"`,
    __VERSION__: `"${version}"`,
    __COMMIT__: `"${short}"`
  };

  let filename = '[name].[contenthash].css';
  let chunkFilename = '[id].css';
  if (/^prod/.test(mode)) {
    filename,
      chunkFilename = '[id].[hash].css';
  }
  const cssExtract = new MiniCssExtractPlugin({
    ignoreOrder: true, // Enable to remove warnings about conflicting order
    filename,
    chunkFilename,
    //sourceMap: true
  })

  const plugins = [
    new CleanWebpackPlugin(),
    new webpack.ProgressPlugin(),
    new DuplicatesPlugin({
      // Emit compilation warning or error? (Default: `false`)
      emitErrors: false,
      // Display full duplicates information? (Default: `false`)
      verbose: true
    }),
    cssExtract,
    new webpack.DefinePlugin(pluginsOptions),
    new WebpackManifestPlugin({
      fileName: 'manifest.json'
    }),
    new StatsWriterPlugin({
      fields: ["assets", "modules"],
      stats: {
        source: true // Needed for webpack5+
      }
    }),
    new CopyPlugin({
      patterns: [{
        from: mediapipeDir,
        to: 'mediapipe',
        globOptions: { ignore: ['**/package.json', '**/README.md', '**/*.d.ts'] },
        noErrorOnMissing: true,
      }]
    }),
    new Sync(opt)
  ];
  return plugins;
};
