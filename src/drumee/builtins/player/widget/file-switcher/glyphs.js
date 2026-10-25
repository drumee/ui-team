// ==================================================================== *
//   Copyright Xialia.com  2011-2026
//   FILE : builtins/player/widget/file-switcher/glyphs
//   TYPE : Helper
// ==================================================================== *

/**
 * The design's file glyphs — the Figma "file icon" set (docx page, sheet
 * grid, pptx), bitmaps from the design file (assets/file-icons) through
 * webpack's file-loader — as CSS variables on :root. The Files rail rows
 * draw them for every document / sheet / slides file, in every viewer, and
 * the Casual editor headers draw the 40px / 36px ones. Installed once, by
 * whichever module loads first.
 */
function url(mod) {
  const u = mod && mod.default ? mod.default : mod;
  return `url("${u}")`;
}

function install() {
  if (typeof document === "undefined" || document.getElementById("fv-file-glyphs")) return;
  try {
    const docx = url(require("assets/file-icons/file-docx.png"));
    const sheet = url(require("assets/file-icons/file-sheet.png"));
    const pptx = url(require("assets/file-icons/file-pptx.png"));
    const style = document.createElement("style");
    style.id = "fv-file-glyphs";
    style.textContent = `:root{--fv-docx-glyph:${docx};--fv-sheet-glyph:${sheet};--fv-pptx-glyph:${pptx}}`;
    document.head.appendChild(style);
  } catch (e) {
    /** the sprite glyphs stay */
  }
}

module.exports = { install };
