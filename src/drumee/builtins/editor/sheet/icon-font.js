/** ================================================================== *
#   FILE : /src/drumee/builtins/editor/sheet/icon-font.js
#   TYPE : helper — the sheet editor's Material Symbols, self-hosted
# ===================================================================**/

// Casual Sheets draws its chrome icons with Material Symbols ligatures, and
// the loading skeleton stays up until that font is in (editor/loading-reveal).
// Casual asks Google for it itself (`ensureChromeFonts`, chrome.js) — the
// FULL variable font, every axis (opsz 20..48, wght 300..700, FILL 0..1,
// GRAD -50..200): 4.28 MB. And it asks only once its chrome first renders,
// i.e. after the multi-MB Univer chunk has downloaded and run, so on a cold
// first open the two biggest downloads ran one after the other, plus fresh
// handshakes to fonts.googleapis.com and fonts.gstatic.com.
//
// Every icon Casual Sheets draws uses ONE instance: its Icon component pins
// `'opsz' 20, 'wght' 400, 'FILL' 0, 'GRAD' 0`. That static instance is
// 333 KB (fonts/, Apache-2.0, from Google Fonts), served from our own origin
// over the connection already open, and requested the moment the sheet window
// opens, in parallel with the Univer chunk.
//
// It is registered under ITS OWN family name, and the sheet skin points only
// the sheet's icons at it. Not under "Material Symbols Outlined": Casual Docs
// imports the full font under that name and does use other instances (filled
// icons, other weights) — a static face sharing the name could win the match
// and draw docs' filled icons hollow. The family still matches
// loading-reveal's /Material Symbols/, so the reveal waits for this face.
//
// Casual's own link to the full font is still injected, but a webfont is only
// downloaded when something renders in its family; once the sheet's icons use
// this face, nothing in the sheet asks for the 4 MB one.
import fontUrl from "./fonts/material-symbols-outlined-20-400.woff2";

export const FAMILY = "Material Symbols Sheet";

let face = null;

/**
 * Register the face and start its download. Idempotent; never throws.
 * @returns {Promise} settles when the face is loaded (or failed)
 */
export function preloadIconFont() {
  if (face) return face.loaded.catch(() => {});
  if (typeof document === "undefined" || !document.fonts || typeof FontFace === "undefined") {
    return Promise.resolve();
  }
  try {
    face = new FontFace(FAMILY, `url(${fontUrl}) format("woff2")`, {
      style: "normal",
      weight: "400",
      display: "block",
    });
    document.fonts.add(face);
    return face.load().catch(() => {});
  } catch (e) {
    face = null;
    return Promise.resolve();
  }
}
