// "Schedule a meeting" modal (Figma component set 1693:140137 — blank
// 1693:140138, filled 1693:140255, information 1693:140389) — create / edit a
// scheduled meeting via room.book/update/remove, one 600px column. Invitees are
// workspace members chosen by typing a name (type-to-search → suggestions →
// removable chips); recurrence lives in ui._mmRecur; the Files section (search,
// Upload, chips) reads ui._mmState. Rendered into the folder window's
// wrapper-dialog.

function memberName(member) {
  return (
    member.fullname ||
    `${member.firstname || ""} ${member.lastname || ""}`.trim() ||
    member.email ||
    member.uid ||
    member.id
  );
}

// A selected invitee chip: name + remove ✕. Marked busy (amber) when the member
// has a conflicting meeting at the chosen time (free/busy — warn only).
function inviteeChip(ui, pfx, attendee) {
  const uid = attendee.uid || attendee;
  const name = attendee.name || uid;
  const busy = !!(ui._mmBusy && ui._mmBusy[uid] && ui._mmBusy[uid].length);
  return Skeletons.Box.X({
    className: `${pfx}-invitee-chip`,
    attrOpt: { "data-uid": uid, "data-busy": busy ? 1 : 0 },
    kids: [
      Skeletons.Note({ className: `${pfx}-invitee-chip-name`, content: name }),
      Skeletons.Button.Svg({
        className: `${pfx}-invitee-chip-x`,
        ico: _a.cross,
        service: "mm-remove-invitee",
        uid,
        bubble: 0,
        uiHandler: [ui],
      }),
    ],
  });
}

// Exported so the window re-feeds just the selected-chips row.
function inviteesChips(ui, pfx) {
  const selected = Array.isArray(ui._mmAttendees) ? ui._mmAttendees : [];
  return selected.map((a) => inviteeChip(ui, pfx, a));
}

// One search-result row (click adds the member).
function inviteeSuggestion(ui, pfx, member) {
  const uid = member.uid || member.id;
  const name = memberName(member);
  return Skeletons.Box.X({
    className: `${pfx}-invitee-option`,
    attrOpt: { "data-uid": uid },
    service: "mm-add-invitee",
    uid,
    uname: name,
    uiHandler: [ui],
    kids: [
      Skeletons.Avatar(member.avatar || "default", `${pfx}-invitee-option-ava`, name),
      Skeletons.Note({ className: `${pfx}-invitee-option-name`, content: name }),
    ],
  });
}

// Members matching `query`, excluding already-selected. Exported for live
// re-feed from _filterInvitees. An empty query lists every remaining member
// (the dropdown half of the combobox) — the container scrolls, so no cap.
function inviteesSuggestions(ui, pfx, query) {
  const q = String(query || "").trim().toLowerCase();
  // String-compared: the pool and the chips come from different sources, and a
  // number/string mismatch would re-offer an already-invited member.
  const chosen = new Set((ui._mmAttendees || []).map((a) => String(a.uid || a)));
  const members = Array.isArray(ui._hubMembers) ? ui._hubMembers : [];
  return members
    .filter((m) => {
      const uid = m.uid || m.id;
      if (!uid || chosen.has(String(uid))) return false;
      if (!q) return true;
      return memberName(m).toLowerCase().includes(q) ||
        String(m.email || "").toLowerCase().includes(q);
    })
    .map((m) => inviteeSuggestion(ui, pfx, m));
}

// Exported for re-feed (sys_pn "mm-recur") when the frequency changes.
function recurRow(ui, pfx) {
  const recur = ui._mmRecur || { freq: "none", until: "" };
  const seg = (freq, label) =>
    Skeletons.Note({
      className: `${pfx}-recur-seg`,
      content: label,
      dataset: { selected: recur.freq === freq ? 1 : 0 },
      attrOpt: { "data-selected": recur.freq === freq ? 1 : 0 },
      service: "mm-set-recur",
      freq,
      uiHandler: [ui],
    });
  const kids = [
    Skeletons.Box.X({
      className: `${pfx}-recur-segs`,
      kids: [
        seg("none", LOCALE.NONE),
        seg("daily", LOCALE.DAILY),
        seg("weekly", LOCALE.WEEKLY),
        seg("monthly", LOCALE.MONTHLY),
      ],
    }),
  ];
  if (recur.freq && recur.freq !== "none") {
    kids.push(
      Skeletons.Box.X({
        className: `${pfx}-recur-until`,
        kids: [
          Skeletons.Note({ className: `${pfx}-recur-until-label`, content: LOCALE.UNTIL }),
          {
            kind: "date_picker",
            className: `${pfx}-date`,
            innerClass: `${pfx}-date-inner`,
            name: "mm-until",
            value: recur.until || "",
            placeholder: LOCALE.SELECT_DATE,
            vendorOpt: {
              dateFormat: "Y-m-d",
              altInput: true,
              altFormat: "d/m/Y",
              // No end date yet → leave it empty; seeding today would read back
              // as "recurs until today", i.e. not at all.
              defaultDate: recur.until || null,
              appendTo: document.body,
              // This is the card's last row, so there is rarely room for the
              // calendar below it — the widget's default "below" ran it off the
              // bottom of the screen. "auto" flips it above the field when the
              // space below can't hold it.
              position: "auto",
            },
            uiHandler: [ui],
          },
        ],
      }),
    );
  }
  return kids;
}

// Read-only "Created by" chip. The creator uid lives in the meeting's
// metadata (written by room.book) and is resolved to a name/avatar by
// ui.meetingCreator. Create mode shows the current user — they become the
// creator on submit.
function creatorChip(ui, pfx, m) {
  const creator = ui.meetingCreator(m);
  return Skeletons.Box.X({
    className: `${pfx}-creator`,
    attrOpt: { "data-uid": creator.uid || "" },
    kids: [
      Skeletons.Avatar(creator.avatar || "default", `${pfx}-creator-ava`, creator.name),
      Skeletons.Note({ className: `${pfx}-creator-name`, content: creator.name }),
      creator.isMe
        ? Skeletons.Note({ className: `${pfx}-creator-you`, content: LOCALE.YOU })
        : null,
    ].filter(Boolean),
  });
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

// Parse "HH:mm" (24h) into 12h display parts, defaulting when empty/invalid.
function parseHm(hm, fallback) {
  const s = hm && /^\d{1,2}:\d{2}$/.test(hm) ? hm : fallback;
  const parts = s.split(":");
  const H = Math.min(23, Math.max(0, parseInt(parts[0], 10) || 0));
  const M = Math.min(59, Math.max(0, parseInt(parts[1], 10) || 0));
  let h12 = H % 12;
  if (h12 === 0) h12 = 12;
  return { h24: H, h12, minute: M, ampm: H >= 12 ? "pm" : "am", hm: `${pad2(H)}:${pad2(M)}` };
}

// Figma time control (2509-140304): [Hour] : [Minute] + a vertical AM/PM toggle.
// Hour/Minute are editable number boxes; the canonical 24h "HH:mm" value lives
// in a hidden input (name mm-stime / mm-etime) kept in sync by _recomputeTime,
// so the submit + free/busy read paths are unchanged.
function timePicker(ui, pfx, which, hm) {
  const t = parseHm(hm, which === "stime" ? "09:00" : "10:00");
  const numBox = (part, val, sub) =>
    Skeletons.Box.Y({
      className: `${pfx}-time-part`,
      kids: [
        Skeletons.Element({
          tagName: "input",
          className: `${pfx}-time-num`,
          attrOpt: {
            type: "text",
            inputmode: "numeric",
            maxlength: "2",
            value: val,
            "data-timepart": part,
            "data-timefor": which,
          },
        }),
        Skeletons.Note({ className: `${pfx}-time-sub`, content: sub }),
      ],
    });
  const seg = (ampm, label) =>
    Skeletons.Note({
      className: `${pfx}-time-seg`,
      content: label,
      dataset: { active: t.ampm === ampm ? 1 : 0 },
      attrOpt: { "data-active": t.ampm === ampm ? 1 : 0, "data-ampm": ampm },
      service: "mm-set-ampm",
      which,
      ampm,
      bubble: 0,
      uiHandler: [ui],
    });
  return Skeletons.Box.X({
    className: `${pfx}-time-picker`,
    attrOpt: { "data-timefor": which },
    kids: [
      numBox("hour", pad2(t.h12), LOCALE.HOUR),
      Skeletons.Note({ className: `${pfx}-time-colon`, content: ":" }),
      numBox("minute", pad2(t.minute), LOCALE.MINUTE),
      Skeletons.Box.Y({
        className: `${pfx}-time-ampm`,
        kids: [seg("am", LOCALE.AM), seg("pm", LOCALE.PM)],
      }),
      Skeletons.Element({
        tagName: "input",
        className: `${pfx}-time-hidden`,
        attrOpt: { type: "hidden", name: `mm-${which}`, value: t.hm },
      }),
    ],
  });
}

function fileLabel(pf) {
  const name = (pf && pf.filename) || "";
  return pf && pf.extension ? `${name}.${pf.extension}` : name;
}

// One Files chip: paperclip + name. Only a file still waiting to be linked
// (picked or uploaded in this sitting) carries the ✕ — what is already on the
// meeting stays read-only, the server has no unlink for it yet. A chip whose
// file exists opens it, for the creator and for every invitee.
function fileChip(ui, pfx, pf) {
  const key = pf.localKey;
  const opens = !!pf.nid && pf.status !== "missing";
  return Skeletons.Box.X({
    className: `${pfx}-attach-chip`,
    attrOpt: {
      "data-key": key,
      "data-status": pf.status || "",
      "data-linked": pf.linked ? 1 : 0,
      "data-opens": opens ? 1 : 0,
    },
    ...(opens ? { service: "mm-open-file", nid: pf.nid, uiHandler: [ui] } : {}),
    kids: [
      // Inert, so a click on the paperclip or the name is the chip's own; the
      // ✕ keeps its service (no kidsOpt, which would silence it too).
      Skeletons.Image.Svg({ ico: "app-attachment", className: `${pfx}-attach-chip-ico`, active: 0 }),
      Skeletons.Note({ className: `${pfx}-attach-chip-name`, content: fileLabel(pf), active: 0 }),
      pf.linked
        ? null
        : Skeletons.Button.Svg({
            className: `${pfx}-attach-chip-x`,
            ico: "ph-x",
            service: "mm-remove-file",
            key,
            bubble: 0,
            uiHandler: [ui],
            attrOpt: { "aria-label": LOCALE.REMOVE },
          }),
    ].filter(Boolean),
  });
}

// Exported so the window re-feeds just the chip row (sys_pn "mm-files").
function fileChips(ui, pfx) {
  const files = (ui._mmState && ui._mmState.files) || [];
  return files.map((pf) => fileChip(ui, pfx, pf));
}

// task.search_files rows under the Search file field (click picks the file).
function fileResults(ui, pfx, rows) {
  return (rows || []).map((r) =>
    Skeletons.Box.X({
      className: `${pfx}-attach-option`,
      attrOpt: { "data-nid": r.nid },
      service: "mm-pick-file",
      nid: r.nid,
      uiHandler: [ui],
      kids: [
        Skeletons.Image.Svg({ ico: "app-attachment", className: `${pfx}-attach-option-ico` }),
        Skeletons.Note({
          className: `${pfx}-attach-option-name`,
          content: fileLabel({ filename: r.filename, extension: r.ext || r.extension }),
        }),
      ],
    }),
  );
}

module.exports = function meetingModal(ui, opt = {}) {
  const pfx = `${ui.fig.family}__meeting-modal`;
  const m = opt.meeting || null;
  const isEdit = !!(m && m.nid);
  const st = ui._mmState || {};

  const field = (label, kid, extraCn = "") =>
    Skeletons.Box.Y({
      className: `${pfx}-field ${extraCn}`,
      kids: [
        Skeletons.Note({ className: `${pfx}-label`, content: label }),
        kid,
      ],
    });

  const header = Skeletons.Box.X({
    className: `${pfx}-header`,
    kids: [
      Skeletons.Note({
        className: `${pfx}-heading`,
        content: isEdit ? LOCALE.MEETING_INFORMATION : LOCALE.SCHEDULE_A_MEETING,
      }),
      Skeletons.Button.Svg({
        className: `${pfx}-close`,
        ico: _a.cross,
        service: "close-meeting-modal",
        uiHandler: [ui],
      }),
    ],
  });

  const title = Skeletons.EntryBox({
    className: `${pfx}-input title`,
    sys_pn: "mm-title",
    name: "mm-title",
    value: (m && m.title) || "",
    placeholder: LOCALE.MEETING_TITLE,
    require: "any",
    showError: false,
    uiHandler: [ui],
  });

  // Rich description: a contenteditable (seeded + wired by _mmInitDescEditor on
  // open) supporting @-mention, /-file, and inline image paste/drop, plus its
  // caret-anchored mention dropdown. The wrapper is position:relative so the
  // dropdown anchors to the field (windows are transform-positioned).
  const description = Skeletons.Box.Y({
    className: `${pfx}-desc`,
    kids: [
      Skeletons.Element({
        tagName: "div",
        className: `${pfx}-desc-editor`,
        flow: "none",
        attrOpt: {
          contenteditable: "true",
          "data-placeholder": LOCALE.WHATS_THIS_ABOUT,
        },
      }),
      Skeletons.Box.Y({
        className: `${pfx}-mention-dropdown`,
        sys_pn: "mm-mention",
        partHandler: ui,
        attrOpt: { "data-open": "0" },
      }),
    ],
  });

  // Files: search the workspace (task.search_files) or Upload from the
  // computer, then chips. room.link_files only takes the meeting's creator, so
  // anyone else just sees the chips.
  const files = Skeletons.Box.Y({
    className: `${pfx}-files`,
    kids: [
      st.canAttach
        ? Skeletons.Box.X({
            className: `${pfx}-files-bar`,
            kids: [
              Skeletons.Box.Y({
                className: `${pfx}-files-search`,
                kids: [
                  // `watch`, like the invitee search: the Entry re-arms it
                  // when it rebuilds its <input>.
                  Skeletons.Entry({
                    className: `${pfx}-files-input`,
                    sys_pn: "mm-files-search",
                    name: "mm-file-search",
                    placeholder: LOCALE.SEARCH_FILE,
                    watch: "mm-file-typed",
                    bubble: 0,
                    uiHandler: [ui],
                    partHandler: ui,
                  }),
                  Skeletons.Box.Y({
                    className: `${pfx}-files-results`,
                    sys_pn: "mm-files-results",
                    partHandler: ui,
                    attrOpt: { "data-open": "0" },
                  }),
                ],
              }),
              Skeletons.Box.X({
                className: `${pfx}-files-upload`,
                service: "mm-upload-files",
                bubble: 0,
                uiHandler: [ui],
                // active:0 or the icon/label eat the click before the service fires.
                kidsOpt: { active: 0 },
                kids: [
                  Skeletons.Image.Svg({ ico: "upload-simple", className: `${pfx}-files-upload-ico` }),
                  Skeletons.Note({ className: `${pfx}-files-upload-label`, content: LOCALE.UPLOAD }),
                ],
              }),
            ],
          })
        : null,
      Skeletons.Box.X({
        className: `${pfx}-files-chips`,
        sys_pn: "mm-files",
        partHandler: ui,
        attrOpt: { "data-count": String((st.files || []).length) },
        kids: fileChips(ui, pfx),
      }),
    ].filter(Boolean),
  });

  // altInput shows d/m/Y; the named input keeps the Y-m-d value read on submit.
  // Create mode with no prefill defaults to today — the value must be in the
  // vendorOpt `dateFormat` (Y-m-d) or flatpickr can't parse it.
  const date = Skeletons.Box.X({
    className: `${pfx}-date-box`,
    kids: [
      {
        kind: "date_picker",
        className: `${pfx}-date`,
        innerClass: `${pfx}-date-inner`,
        name: "mm-date",
        value: (m && m.date_ymd) || Dayjs().format("YYYY-MM-DD"),
        vendorOpt: {
          dateFormat: "Y-m-d",
          altInput: true,
          altFormat: "d/m/Y",
          appendTo: document.body,
          // Flip above when a short window leaves no room below (see mm-until).
          position: "auto",
        },
        // Moving the meeting re-runs the invitees' free/busy check.
        service: "mm-recheck-availability",
        uiHandler: [ui],
      },
      Skeletons.Image.Svg({ ico: "top-calendar", className: `${pfx}-date-ico` }),
    ],
  });

  // Invitee combobox: an underline field holding removable chips + a search
  // input, with a suggestion dropdown fed live by _filterInvitees. Focusing the
  // input (or clicking the caret) lists every member; typing filters that list.
  const invitees = Skeletons.Box.Y({
    className: `${pfx}-invitees`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}-invitees-control`,
        kids: [
          Skeletons.Box.X({
            className: `${pfx}-invitees-chips`,
            sys_pn: "mm-invitees-chips",
            partHandler: ui,
            kids: inviteesChips(ui, pfx),
          }),
          // `watch`, not a hand-attached DOM listener: the Entry rebuilds its
          // <input> on reload and re-arms `watch` itself, where an external
          // listener would be silently dropped.
          Skeletons.Entry({
            className: `${pfx}-invitees-search`,
            sys_pn: "mm-invitees-search",
            name: "mm-invitee-search",
            placeholder: LOCALE.ADD_FOLDER_MEMBER,
            watch: "mm-invitee-typed",
            bubble: 0,
            uiHandler: [ui],
            partHandler: ui,
          }),
          // Visible affordance that the whole member list is one click away.
          Skeletons.Button.Svg({
            className: `${pfx}-invitees-caret`,
            ico: "apps-caret-down",
            bubble: 0,
            service: "mm-toggle-invitee-list",
            uiHandler: [ui],
          }),
        ],
      }),
      Skeletons.Box.Y({
        className: `${pfx}-invitees-suggestions`,
        sys_pn: "mm-invitees-suggestions",
        partHandler: ui,
      }),
    ],
  });

  const recur = Skeletons.Box.Y({
    className: `${pfx}-recur`,
    sys_pn: "mm-recur",
    partHandler: ui,
    kids: recurRow(ui, pfx),
  });

  // Ownership is enforced server-side (room.update / room.remove answer
  // NOT_MEETING_OWNER), so the actions are always offered. Gating them on a
  // client-side creator check stranded the organizer with a Join-only dialog
  // whenever the recorded uid didn't line up with Visitor.id. The × in the
  // header closes the dialog; there is no Cancel.
  const footerKids = isEdit
    ? [
        Skeletons.Note({
          className: `${pfx}-btn danger`,
          content: LOCALE.DELETE_SCHEDULE,
          service: "meeting-modal-delete",
          uiHandler: [ui],
        }),
        Skeletons.Note({
          className: `${pfx}-btn ghost`,
          content: LOCALE.JOIN_MEETING,
          service: "join-meeting",
          uiHandler: [ui],
        }),
        Skeletons.Note({
          className: `${pfx}-btn primary`,
          content: LOCALE.UPDATE_SCHEDULE,
          service: "meeting-modal-submit",
          uiHandler: [ui],
        }),
      ]
    : [
        Skeletons.Note({
          className: `${pfx}-btn primary`,
          content: LOCALE.SCHEDULE,
          service: "meeting-modal-submit",
          uiHandler: [ui],
        }),
      ];

  return Skeletons.Box.Y({
    className: `${pfx}`,
    debug: __filename,
    dataset: { mode: isEdit ? "edit" : "create" },
    attrOpt: { "data-nid": (m && m.nid) || "" },
    kids: [
      header,
      Skeletons.Box.Y({
        className: `${pfx}-body`,
        kids: [
          field(LOCALE.TITLE, title),
          field(LOCALE.DESCRIPTION_AGENDA, description),
          field(LOCALE.FILES, files),
          field(LOCALE.DATE, date),
          Skeletons.Box.X({
            className: `${pfx}-row ${pfx}-time-row`,
            kids: [
              field(LOCALE.ENTER_TIME, timePicker(ui, pfx, "stime", m && m.stime_hm)),
              Skeletons.Image.Svg({ ico: "arrow-right", className: `${pfx}-time-arrow` }),
              field(LOCALE.END_TIME, timePicker(ui, pfx, "etime", m && m.etime_hm)),
            ],
          }),
          Skeletons.Box.X({
            className: `${pfx}-row`,
            kids: [
              field(LOCALE.INVITEES, invitees),
              field(LOCALE.CREATED_BY, creatorChip(ui, pfx, m)),
            ],
          }),
          field(LOCALE.REPEAT, recur),
        ],
      }),
      // The modal's one messaging surface: free/busy, a missing title, a save
      // that failed, files that did not attach. Pinned above the footer so it
      // stays in view while the body scrolls.
      Skeletons.Note({
        className: `${pfx}-availability`,
        sys_pn: "mm-availability",
        partHandler: ui,
        content: "",
      }),
      Skeletons.Box.X({ className: `${pfx}-footer`, kids: footerKids }),
    ],
  });
};

module.exports.inviteesChips = inviteesChips;
module.exports.inviteesSuggestions = inviteesSuggestions;
module.exports.recurRow = recurRow;
module.exports.fileChips = fileChips;
module.exports.fileResults = fileResults;
module.exports.fileLabel = fileLabel;
