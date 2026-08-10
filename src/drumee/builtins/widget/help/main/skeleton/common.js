/**
 * Pieces shared by every Get help page: the video placeholder, the article
 * card grid, and the "Was this helpful? / Contact Support" footer row.
 */

/**
 * 16:9 media block.
 *
 * Nothing media-related is loaded up front: the frame renders as a poster
 * (backdrop + play badge) and the `<video>` is only created once the badge
 * is clicked — help_main.playVideo() feeds videoPlayer() into this part. A
 * page that is opened but never played therefore costs no video bytes.
 *
 * `video` is whatever help_main.getVideo() resolved for the page (null when
 * the install configured no source, see mock.js pageVideo). With no source
 * the poster keeps its "coming soon" state: the backdrop blurs and the
 * frame is inert — a play button that starts nothing is a dead affordance.
 */
function videoBlock(ui, video) {
  const pfx = `${ui.fig.family}__video`;

  return Skeletons.Box.Y({
    className: `${pfx}-frame`,
    // Named so playVideo() can swap the poster out for the player without
    // re-rendering the rest of the page.
    sys_pn: "help-video",
    attrOpt: { "data-placeholder": video ? 0 : 1 },
    service: video ? "help-play-video" : null,
    uiHandler: video ? [ui] : undefined,
    kidsOpt: { active: 0 },
    kids: videoPoster(ui, video),
  });
}

/**
 * What fills the frame before playback starts — and instead of it, when
 * there is no source to play.
 */
function videoPoster(ui, video) {
  const pfx = `${ui.fig.family}__video`;

  return [
    // Separate layer so only the backdrop blurs — blurring the frame would
    // smear the badge and label sitting on top of it.
    Skeletons.Box.Z({ className: `${pfx}-backdrop` }),
    Skeletons.Box.Y({
      className: `${pfx}-overlay`,
      kids: [
        Skeletons.Box.X({
          className: `${pfx}-play`,
          kids: [
            Skeletons.Image.Svg({
              ico: "ph-play-fill",
              className: `${pfx}-play-ico`,
            }),
          ],
        }),
        video
          ? null
          : Skeletons.Note({
              className: `${pfx}-coming-soon`,
              content: LOCALE.COMING_SOON,
            }),
      ].filter(Boolean),
    }),
  ];
}

/**
 * The player, fed into the frame on the first click.
 *
 * It deliberately carries no `src`: help_main._startVideo() attaches the
 * source once the element is in the DOM, because an HLS stream is handed to
 * the element through hls.js rather than set as an attribute (same as
 * builtins/player/video).
 *
 * The `id` is what lets the widget find the element again — the part being
 * ready does not mean it has been attached yet, so the source is attached
 * after a waitElement() on this id rather than off `child.el`.
 */
function videoPlayer(ui) {
  const pfx = `${ui.fig.family}__video`;

  return Skeletons.Element({
    tagName: "video",
    className: `${pfx}-el`,
    sys_pn: "help-video-el",
    attribute: { id: ui.videoElId(), controls: "", playsinline: "" },
  });
}

/** One article card: file glyph + title, then the summary line. */
function articleCard(ui, article) {
  const pfx = `${ui.fig.family}__article`;
  return Skeletons.Box.Y({
    className: `${pfx}-card`,
    service: "help-open-article",
    article_id: article.id,
    article_url: article.url,
    uiHandler: [ui],
    kidsOpt: { active: 0 },
    kids: [
      Skeletons.Box.X({
        className: `${pfx}-heading`,
        kids: [
          Skeletons.Image.Svg({ ico: "ph-file-text", className: `${pfx}-ico` }),
          Skeletons.Note({ className: `${pfx}-title`, content: article.title }),
        ],
      }),
      Skeletons.Note({
        className: `${pfx}-summary`,
        content: article.summary,
      }),
    ],
  });
}

/** Two-column card grid. Returns null when a page has no articles. */
function articleGrid(ui, articles = []) {
  if (!articles.length) return null;
  return Skeletons.Box.G({
    className: `${ui.fig.family}__article-grid`,
    kids: articles.map((a) => articleCard(ui, a)),
  });
}

/** Split from its wrapper so a vote re-feeds this strip, not the page. */
function feedbackRow(ui) {
  const pfx = `${ui.fig.family}__feedback`;
  const vote = ui.getVote();

  const thumb = (ico, value) =>
    Skeletons.Box.X({
      className: `${pfx}-thumb`,
      attrOpt: { "data-active": vote === value ? 1 : 0 },
      service: "help-vote",
      vote: value,
      uiHandler: [ui],
      kidsOpt: { active: 0 },
      kids: [Skeletons.Image.Svg({ ico, className: `${pfx}-thumb-ico` })],
    });

  const supportBtn = (ico, channel) =>
    Skeletons.Box.X({
      className: `${pfx}-support-btn`,
      service: "help-contact-support",
      channel,
      uiHandler: [ui],
      kidsOpt: { active: 0 },
      kids: [Skeletons.Image.Svg({ ico, className: `${pfx}-support-ico` })],
    });

  return Skeletons.Box.X({
    className: `${pfx}-row`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}-helpful`,
        kids: [
          Skeletons.Note({
            className: `${pfx}-label`,
            content: LOCALE.HELP_WAS_THIS_HELPFUL,
          }),
          Skeletons.Box.X({
            className: `${pfx}-thumbs`,
            kids: [
              thumb("ph-thumbs-up", "up"),
              thumb("ph-thumbs-down", "down"),
            ],
          }),
        ],
      }),
      Skeletons.Box.X({
        className: `${pfx}-support`,
        kids: [
          Skeletons.Note({
            className: `${pfx}-support-link`,
            content: LOCALE.HELP_CONTACT_SUPPORT,
            service: "help-contact-support",
            channel: "mail",
            uiHandler: [ui],
          }),
          Skeletons.Box.X({
            className: `${pfx}-support-btns`,
            kids: [
              supportBtn("ph-telegram-logo", "telegram"),
              supportBtn("ph-envelope-simple", "mail"),
            ],
          }),
        ],
      }),
    ],
  });
}

/** Wrapper carrying the named part, so setVote() can re-feed the row. */
function feedback(ui) {
  return Skeletons.Box.Y({
    className: `${ui.fig.family}__feedback`,
    sys_pn: "help-feedback",
    kids: [feedbackRow(ui)],
  });
}

module.exports = { videoBlock, videoPlayer, articleGrid, feedback, feedbackRow };
