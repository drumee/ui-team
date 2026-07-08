const { filesize } = require("@drumee/ui-essentials");

// Simulated (size-scaled) download-progress body for the window_info modal.
//
// Why simulated: for large archives (> MAX_BLOB_SIZE, 100 MB) the ZIP is streamed
// by the BROWSER's own native download (media.zip via getFromUrl), so the app
// cannot read real byte progress — the browser owns the stream. Per product
// (Natrix, 2026-07-08) a reassuring bar is enough; the number need not be real.
// We ease a bar toward ~90% over a size-bucketed duration (pure CSS keyframe,
// holds at 90% via animation-fill-mode) and tell the user the file is saving in
// their browser. The real byte-accurate design (stream-to-disk) is preserved in
// memory (project_dmz_download_progress_2b) if it is ever required.
//
// Replaces the plain Wm.alert(DOWNLOAD_LONG_TIME) notice; it is fed to
// window_info as a `body` (see Wm.downloadNotice in window/manager.js).
const __window_info_download_progress = function (ui) {
  const fig = ui.fig.family; // window-info
  const zipname = ui.mget("zipname") || "";
  const bytes = Number(ui.mget(_a.filesize)) || 0;
  const size = filesize(bytes);

  // Size bucket → the fill's ease-out duration (defined in skin). Fake and
  // approximate on purpose: a bigger archive eases more slowly so the motion
  // "feels" proportional to what's being downloaded.
  const GB = 1000 * 1000 * 1000;
  let bucket = "xs";
  if (bytes >= 10 * GB) bucket = "lg";
  else if (bytes >= GB) bucket = "md";
  else if (bytes >= 100 * 1000 * 1000) bucket = "sm";

  return Skeletons.Box.Y({
    debug: __filename,
    className: `${fig}__container ${fig}__dl-progress`,
    kids: [
      Skeletons.Note({
        className: `${fig}__message inner`,
        // Same string the old alert used (localised in all 6 langs) so nothing
        // regresses on wording; `<u>{0}</u> for {1}` = name + human size.
        content: LOCALE.DOWNLOAD_LONG_TIME.format(zipname, size),
      }),

      Skeletons.Box.X({
        className: `${fig}__dl-track`,
        kids: [
          Skeletons.Box.X({
            className: `${fig}__dl-fill ${fig}__dl-fill--${bucket}`,
          }),
        ],
      }),

      Skeletons.Note({
        className: `${fig}__dl-hint`,
        content:
          LOCALE.DOWNLOAD_SAVING_IN_BROWSER ||
          "Your file is saving to your browser’s downloads — you can keep working.",
      }),
    ],
  });
};

module.exports = __window_info_download_progress;
