const { videoBlock, articleGrid, feedback } = require("./common");
const { faqPage } = require("./faq");

/**
 * Right-hand column of the Get help screen. Product tour and Self-hosting
 * share one layout (title → optional intro → video → article grid); FAQ has
 * its own. Every page ends with the shared feedback row.
 */

/** Product tour / Self-hosting setup. */
function articlePage(ui) {
  const pfx = ui.fig.family;
  const data = ui.getPageData();

  return Skeletons.Box.Y({
    className: `${pfx}__page`,
    kids: [
      Skeletons.Box.Y({
        className: `${pfx}__page-head`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__page-title`,
            content: data.title,
          }),
          data.intro
            ? Skeletons.Note({
                className: `${pfx}__page-intro`,
                content: data.intro,
              })
            : null,
        ].filter(Boolean),
      }),
      // Through getVideo(), not data.video directly: the frame drawn here
      // and the click that starts it read the source the same way, so they
      // cannot disagree about whether there is anything to play.
      videoBlock(ui, ui.getVideo()),
      // The "Product Tour" CTA (common.js tourButton -> `help-main__tour-row`)
      // used to sit here on the product-tour page. It is hidden for now: put
      // `ui.getPage() === "product-tour" ? tourButton(ui) : null` back, and
      // re-import tourButton above, to restore it. Note that this was the only
      // user-initiated way into desk_tutorial (desk/index.js
      // _startProductTour); the automatic post-signup run and `?tutorial=1`
      // are unaffected.
      articleGrid(ui, data.articles),
    ].filter(Boolean),
  });
}

function content(ui) {
  const page = ui.getPage() === "faq" ? faqPage(ui) : articlePage(ui);
  return [page, feedback(ui)];
}

export default content;
