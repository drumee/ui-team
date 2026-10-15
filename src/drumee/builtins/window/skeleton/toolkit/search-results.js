/**
 * Content for the chat-header search-results overlay (channel.search). Renders
 * a "Search results" label + one row per matching message (author, relative
 * time, 150-char preview, and — when the hit was an attachment's name — that
 * filename), or a "No results" note. Each row jumps to the message
 * (search-result-jump) on click. Newest-first (server order).
 * @param {*} ui folder window
 * @param {Array} rows channel.search result rows
 */
function searchResults(ui, rows) {
  const grp = ui.fig.group;
  const list = Array.isArray(rows) ? rows : [];
  if (!list.length) {
    return [
      Skeletons.Note({
        className: `${grp}__search-results-empty`,
        content: LOCALE.NO_RESULTS || "No results",
      }),
    ];
  }
  const row = (r) => {
    const name = r.fullname || `${r.firstname || ""} ${r.lastname || ""}`.trim();
    let when = "";
    const ts = Number(r.ctime || 0);
    if (ts) {
      try {
        when = Dayjs.unix(ts).fromNow();
      } catch (e) {
        when = "";
      }
    }
    return Skeletons.Box.X({
      className: `${grp}__search-result`,
      service: "search-result-jump",
      message_id: `${r.message_id || r.id || ""}`,
      uiHandler: [ui],
      kidsOpt: { active: 0 },
      kids: [
        // No avatar: the proc returns no avatar URL, so a generated placeholder
        // (color-from-name) was misleading. Show name + time + preview only.
        // active:0 is propagated at EVERY nesting level (kidsOpt per container):
        // each view wires its own onclick that stopPropagation()s and trips the
        // 300ms global click throttle, so a click landing on a nested non-active
        // descendant would be swallowed before it bubbles to the row's service
        // (needing several taps). active:0 leaves them handler-less → the click
        // bubbles straight to the row.
        Skeletons.Box.Y({
          className: `${grp}__search-result-body`,
          kidsOpt: { active: 0 },
          kids: [
            Skeletons.Box.X({
              className: `${grp}__search-result-top`,
              kidsOpt: { active: 0 },
              kids: [
                Skeletons.Note({
                  className: `${grp}__search-result-name`,
                  active: 0,
                  content: name,
                }),
                Skeletons.Note({
                  className: `${grp}__search-result-time`,
                  active: 0,
                  content: when,
                }),
              ],
            }),
            Skeletons.Note({
              className: `${grp}__search-result-preview`,
              active: 0,
              content: r.preview || "",
            }),
            // A filename-only hit (channel_search_scoped match_filename): the
            // preview alone would not show why the message matched.
            r.match_filename
              ? Skeletons.Note({
                  className: `${grp}__search-result-file`,
                  active: 0,
                  content: r.match_filename,
                })
              : null,
          ].filter(Boolean),
        }),
      ],
    });
  };
  return [
    Skeletons.Note({
      className: `${grp}__search-results-label`,
      content: LOCALE.SEARCH_RESULTS || "Search results",
    }),
    Skeletons.Box.Y({
      className: `${grp}__search-results-list`,
      kids: list.map(row),
    }),
  ];
}

/**
 * Placeholder content for the search-results card while channel.search is in
 * flight: the same label + one row shaped like a result (name + time,
 * two preview lines; the folder skin sweeps a shimmer across them). Swapped for searchResults() when the
 * reply lands. Decorative — nothing in it is worth announcing.
 * @param {*} ui folder window
 */
function searchResultsLoading(ui) {
  const grp = ui.fig.group;
  const c = `${grp}__search-result`;
  const row =
    `<div class="${c}-ph">` +
    `<div class="${c}-ph-top">` +
    `<div class="${c}-ph-name"></div>` +
    `<div class="${c}-ph-time"></div>` +
    `</div>` +
    `<div class="${c}-ph-preview"></div>` +
    `<div class="${c}-ph-preview"></div>` +
    `</div>`;
  return [
    Skeletons.Note({
      className: `${grp}__search-results-label`,
      content: LOCALE.SEARCH_RESULTS || "Search results",
    }),
    Skeletons.Element({
      className: `${grp}__search-results-loading`,
      content: `<div aria-hidden="true">${row}</div>`,
    }),
  ];
}

module.exports = { searchResults, searchResultsLoading };
