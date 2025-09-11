const argparse = require("argparse");

const parser = new argparse.ArgumentParser({
  description: "Drumee UI seeds parser ",
  add_help: true,
});

parser.add_argument("--app-base", {
  type: String,
  default: 'src/drumee',
  help: "App source base",
});

parser.add_argument("--from", {
  type: String,
  default: process.env.UI_SRC_PATH,
  help: "Source base",
});

parser.add_argument("--src-dir", {
  type: String,
  default: process.env.UI_SRC_PATH,
  help: "Source directory",
});

parser.add_argument("--verbose", {
  type: String,
  default: '',
  help: "Debuug",
});

parser.add_argument("--libs", {
  type: String,
  default: '',
  help: "Libs to walk through",
});



const args = parser.parse_args();
module.exports = args;
