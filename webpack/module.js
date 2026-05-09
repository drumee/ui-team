const { resolve } = require("path");
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const drumee_path = 'src/drumee/';

module.exports = function (basedir, mode) {
  const isProd = /^prod/.test(mode);
  // Source maps: useful in development, omit in production to save size.
  const sourceMap = !isProd;
  a = {
    rules: [{
      test: /\.(sa|sc|c)ss$/,

      use: [
        MiniCssExtractPlugin.loader,
        {
          loader: 'css-loader',
          options: {
            sourceMap,
            importLoaders: 1
          },
        }, {
          loader: 'postcss-loader',
          options: {
            sourceMap,
          }
        }, {
          loader: 'sass-loader',
          options: {
            sourceMap,
            sassOptions: {
              sourceMap,
              // Never embed source maps inline — keeps CSS output lean and
              // lets the browser load .map files on demand.
              sourceMapEmbed: false,
              includePaths: [
                resolve(basedir, drumee_path, 'skin'),
                resolve(basedir, 'node_modules')
              ]
            }
          }
        }
      ],
    }, {
      test: /\.coffee$/,
      use: ["coffee-loader"],
    }, {
      test: /\.(png|jpg|gif|jpeg)$/,
      use: ["file-loader"]
    }, {
      test: /(\.woff|\.woff2|\.ttf|\.eot|\.svg)($|\?.*$)/,
      use: ['url-loader']
    }, {
      test: /\.wasm$/,
      type: 'webassembly/async',
    }, {
      test: /babel(.*)\.js?$/,
      use: ['babel-loader']
    }, {
      test: /\.(txt|text)$/i,
      use: ['raw-loader']
    }, {
      test: /\.tpl$/,
      use: ['underscore-template-loader']
    }, {
      test: /\.tsx?$/,
      use: 'ts-loader',
      exclude: /node_modules/,
    }],
  };
  return a;
};
