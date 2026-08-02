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
      videoBlock(ui),
      articleGrid(ui, data.articles),
    ].filter(Boolean),
  });
}

function content(ui) {
  const page = ui.getPage() === "faq" ? faqPage(ui) : articlePage(ui);
  return [page, feedback(ui)];
}

export default content;
