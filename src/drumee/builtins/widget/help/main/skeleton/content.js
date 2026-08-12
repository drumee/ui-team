const { videoBlock, tourButton, articleGrid, feedback } = require("./common");
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
      // Product tour only. This layout is shared with Self-hosting, where a
      // button labelled "Product Tour" under a self-hosting video would read
      // as a mismatch.
      ui.getPage() === "product-tour" ? tourButton(ui) : null,
      articleGrid(ui, data.articles),
    ].filter(Boolean),
  });
}

function content(ui) {
  const page = ui.getPage() === "faq" ? faqPage(ui) : articlePage(ui);
  return [page, feedback(ui)];
}

export default content;
