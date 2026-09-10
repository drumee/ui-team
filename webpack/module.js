const { resolve } = require("path");
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const drumee_path = 'src/drumee/';

module.exports = function (basedir) {
  a = {
    rules: [{
      test: /\.(sa|sc|c)ss$/,

      use: [
        // REAL STYLESHEETS, NOT RUNTIME <style> INJECTION.
        //
        // style-loader shipped all 719 SCSS files inside the JS and injected
        // them as separate <style> tags — 92 of them live, 200 stylesheets in
        // a longer session. Chrome consults one RuleSet per stylesheet for
        // every element it restyles, so a ~5,800-element recalc did ~1.2M
        // rule-set consultations. Measured on production 2026-09-11: 12-30us
        // per element, against well under 1us for a normal document, and 33.4s
        // of style recalculation in one session.
        //
        // Paired with the `styles` cacheGroup in webpack.js, which merges every
        // chunk's CSS into ONE file: 200 stylesheets -> 1.
        //
        // REQUIRES THE SERVER TO LINK IT. The HTML shell (server-team
        // client/page.js + client/templates/bootstrap.js.tpl) lists the JS
        // bundles from manifest.json and links no app CSS; with this loader and
        // no <link>, the app renders completely unstyled. Ship both together.
        MiniCssExtractPlugin.loader,
        {
          loader: 'css-loader',
          options: {
            sourceMap: true,
            importLoaders: 1
          },
        }, {
          loader: 'sass-loader',
          options: {
            sourceMap: true,
            //api: "modern",
            sassOptions: {
              sourceMap: true,
              sourceMapEmbed: true,
              // Sass prepends a BOM to compressed output containing non-ASCII;
              // style-loader injects it glued to the first selector, which kills
              // the :root{--font-*} block. Never emit @charset/BOM.
              charset: false,
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
      // Country flags are served as separate, content-hashed files (loaded on
      // demand as <img>/background URLs) instead of inlined — keeps the bundle
      // lean despite ~240 SVGs. Same self-hosted philosophy as the wasm rule.
      test: /\.svg$/,
      include: resolve(basedir, drumee_path, 'assets', 'flags'),
      type: 'asset/resource',
    }, {
      test: /(\.woff|\.woff2|\.ttf|\.eot|\.svg)($|\?.*$)/,
      exclude: resolve(basedir, drumee_path, 'assets', 'flags'),
      use: ['url-loader']
    }, {
      // Emit .wasm as a separate, content-hashed asset and resolve
      // `import url from '*.wasm'` to its public URL — self-hosted in our own
      // build output, no CDN. PDFium fetches that URL for the raw binary
      // (init({ wasmBinary })), so asset/resource — not webassembly/async,
      // which would instantiate the module — is what we want here.
      test: /\.wasm$/,
      type: 'asset/resource',
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
