/**
 * Save a fetched blob as a download that survives the browser's
 * "allow multiple downloads" prompt.
 *
 * A page may start ONE download on its own; every further one the browser
 * holds behind that prompt and starts once the user allows it. ui-core's
 * getBlob (letc/mfs.js) revokes its blob URL 300ms after the click — long
 * before anyone answers — so a held download then fetched a dead URL and
 * was lost: two folders selected, one zip received. Here the URL stays valid
 * for HOLD_MS. Everything else is ui-core's: the same hidden anchor, and
 * `eod` on the owner 300ms after the click.
 *
 * Call it with the owning view as `this` (it reads _id and raises eod on it).
 */
const HOLD_MS = 5 * 60 * 1000;
const EOD_AFTER_MS = 300;

function saveHeld(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement(_K.tag.a);
  a.download = filename || "download";
  a.hidden = "";
  a.setAttribute(_a.id, this._id + "-dl");
  a.setAttribute(_a.href, url);
  a.setAttribute(_a.target, "_blank");
  a.style.position = _a.absolute;
  a.style.display = _a.none;
  const onClick = () => {
    a.removeEventListener(_e.click, onClick);
    setTimeout(() => {
      this.trigger(_e.eod, blob);
      this.triggerMethod(_e.eod, blob);
      a.remove();
    }, EOD_AFTER_MS);
    // Not with the rest: a download held behind the permission prompt fetches
    // this URL only once the user has answered.
    setTimeout(() => URL.revokeObjectURL(url), HOLD_MS);
  };
  a.addEventListener(_e.click, onClick, false);
  a.click();
}

module.exports = { saveHeld, HOLD_MS, EOD_AFTER_MS };
