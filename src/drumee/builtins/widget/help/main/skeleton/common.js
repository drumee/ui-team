/**
 * Pieces shared by every Get help page: the video placeholder, the article
 * card grid, and the "Was this helpful? / Contact Support" footer row.
 */

/**
 * True when the signed-in user is the account that answers Contact Support.
 * Reads the desk's cached lookup, warmed at boot; false while it is still in
 * flight, which only ever shows the link to someone who could have used it.
 */
function isSupportAccount() {
  return !!(
    typeof Desk !== "undefined" &&
    _.isFunction(Desk.isSupportContact) &&
    Desk.isSupportContact()
  );
}

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
  const poster = video ? ui.videoPosterUrl() : null;

  return [
    // Separate layer so only the backdrop blurs — blurring the frame would
    // smear the badge and label sitting on top of it.
    //
    // With a poster configured this same layer carries the thumbnail: the
    // skin drops the gradient's blow-up and switches to cover, so a still
    // from the video shows instead of the tinted fallback.
    Skeletons.Box.Z({
      className: `${pfx}-backdrop`,
      attrOpt: poster ? { "data-poster": 1 } : undefined,
      style: poster ? { backgroundImage: `url("${poster}")` } : undefined,
    }),
    Skeletons.Box.Y({
      className: `${pfx}-overlay`,
      // The whole poster has to stay inert, not just the frame's direct
      // kids. A letc element left active binds its own onclick, and that
      // handler calls stopPropagation() BEFORE it looks for handlers
      // (ui-core letc.js __handleClick) — so the badge swallowed the click
      // and the frame's service never fired. `kidsOpt` only reaches one
      // level, hence the repeat here and on the badge below.
      kidsOpt: { active: 0 },
      kids: [
        Skeletons.Box.X({
          className: `${pfx}-play`,
          kidsOpt: { active: 0 },
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
  const poster = ui.videoPosterUrl();
  // Carried onto the element too, so the swap from poster to player does
  // not flash black while the first frame is still being decoded.
  const attribute = { id: ui.videoElId(), controls: "", playsinline: "" };
  if (poster) attribute.poster = poster;

  return Skeletons.Element({
    tagName: "video",
    className: `${pfx}-el`,
    sys_pn: "help-video-el",
    attribute,
  });
}

/**
 * Primary CTA that starts the interactive product tour (desk_tutorial).
 *
 * Label-only, so a single Note carries the click — same primitive as the
 * "Contact Support" link below. Nothing is nested inside it, which is why it
 * needs none of the `kidsOpt: { active: 0 }` inerting the video poster and the
 * article cards do: there is no inner letc element to swallow the click.
 *
 * The row wrapper is what pins the button to the right edge of the content
 * column, and gives the mobile breakpoint a single element to restyle when the
 * button goes full width.
 */
function tourButton(ui) {
  const pfx = `${ui.fig.family}__tour`;

  return Skeletons.Box.X({
    className: `${pfx}-row`,
    kids: [
      Skeletons.Note({
        className: `${pfx}-btn`,
        content: LOCALE.HELP_START_PRODUCT_TOUR,
        service: "help-product-tour",
        uiHandler: [ui],
      }),
    ],
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
          // The link starts a live conversation with a real person; the two
          // icons beside it stay the asynchronous channels. The desk falls
          // back to mail when no support account is configured, so this is
          // never a dead click.
          //
          // Hidden for the account that ANSWERS support — there is no
          // conversation to open with yourself. The icons stay: mailing or
          // messaging the shared channel is still meaningful.
          isSupportAccount()
            ? null
            : Skeletons.Note({
                className: `${pfx}-support-link`,
                content: LOCALE.HELP_CONTACT_SUPPORT,
                service: "help-contact-support",
                channel: "chat",
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

module.exports = {
  videoBlock,
  videoPlayer,
  tourButton,
  articleGrid,
  feedback,
  feedbackRow,
};
