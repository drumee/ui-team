
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { DuplicatesPlugin } = require("inspectpack/plugin");
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const { StatsWriterPlugin } = require("webpack-stats-plugin");

const Sync = require('./sync');


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

  let filename = '[name].css';
  let chunkFilename = '[id].css';
  if (/^prod/.test(mode)) {
    filename = '[name].[hash].css';
    chunkFilename = '[id].[hash].css';
  }
  const cssExtract = new MiniCssExtractPlugin({
    ignoreOrder: false, // Enable to remove warnings about conflicting order
    filename,
    chunkFilename,
    //sourceMap: true
  })

  const plugins = [
    require('./shortcut')(webpack),
    new CleanWebpackPlugin(),
    new webpack.ProgressPlugin(),
    new StatsWriterPlugin({
      fields: ["assets", "modules"],
      stats: {
        source: true // Needed for webpack5+
      }
    }),
    new DuplicatesPlugin({
      // Emit compilation warning or error? (Default: `false`)
      emitErrors: false,
      // Display full duplicates information? (Default: `false`)
      verbose: true
    }),
    cssExtract,
    new webpack.DefinePlugin(pluginsOptions),
    new Sync(opt)
  ];
  return plugins;
};
