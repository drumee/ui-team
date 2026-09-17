const { resolve } = require("path");
const drumee_path = 'src/drumee/';

module.exports = function (basedir) {
  a = {
    rules: [{
      test: /\.(sa|sc|c)ss$/,

      use: [
        'style-loader',
        //MiniCssExtractPlugin.loader,
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
      // @casualoffice ships real .woff2 fonts referenced from its own CSS.
      // url-loader (deprecated under webpack 5) mis-emits them as JS modules
      // under a .woff2 name, so the browser gets `export default "data:..."`,
      // OTS rejects it as "invalid sfntVersion", and the Casual layout engine
      // cannot measure text — the document page renders blank. Emit them as raw
      // font files instead so the bytes reach the browser intact.
      test: /\.woff2$/,
      include: /[\\/]@casualoffice[\\/]/,
      type: 'asset/resource',
    }, {
      test: /(\.woff|\.woff2|\.ttf|\.eot|\.svg)($|\?.*$)/,
      exclude: [
        resolve(basedir, drumee_path, 'assets', 'flags'),
        /[\\/]@casualoffice[\\/]/,
      ],
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
