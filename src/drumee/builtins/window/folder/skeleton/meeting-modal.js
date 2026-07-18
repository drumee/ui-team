// Meeting Information modal (Figma 2510-145902) — create / edit a scheduled
// meeting via room.book/update/remove. Invitees are workspace members (uids);
// recurrence lives in ui._mmRecur. Rendered into the folder window's wrapper-dialog.

function memberChip(ui, pfx, member) {
  const uid = member.uid || member.id;
  const name = member.fullname || `${member.firstname || ""} ${member.lastname || ""}`.trim() || uid;
  const selected = (ui._mmAttendees || []).some((a) => (a.uid || a) === uid);
  // Busy = this member has a conflicting meeting at the chosen time (free/busy).
  const busy = !!(ui._mmBusy && ui._mmBusy[uid] && ui._mmBusy[uid].length);
  return Skeletons.Box.X({
    className: `${pfx}-member-chip`,
    dataset: { selected: selected ? 1 : 0, busy: busy ? 1 : 0, uid },
    attrOpt: { "data-selected": selected ? 1 : 0, "data-busy": busy ? 1 : 0, "data-uid": uid },
    service: "mm-toggle-invitee",
    uid,
    uname: name,
    uiHandler: [ui],
    kids: [
      Skeletons.Avatar(member.avatar || "default", `${pfx}-member-ava`, name),
      Skeletons.Note({ className: `${pfx}-member-name`, content: name }),
    ],
  });
}

// Exported so the window re-feeds just this row (sys_pn "mm-invitees-chips").
function inviteesChips(ui, pfx) {
  const members = Array.isArray(ui._hubMembers) ? ui._hubMembers : [];
  return members.map((m) => memberChip(ui, pfx, m));
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
            vendorOpt: { dateFormat: "Y-m-d", altInput: true, altFormat: "d/m/Y", appendTo: document.body },
            uiHandler: [ui],
          },
        ],
      }),
    );
  }
  return kids;
}

module.exports = function meetingModal(ui, opt = {}) {
  const pfx = `${ui.fig.family}__meeting-modal`;
  const m = opt.meeting || null;
  const isEdit = !!(m && m.nid);

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
      Skeletons.Note({ className: `${pfx}-heading`, content: LOCALE.MEETING_INFORMATION }),
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
    placeholder: LOCALE.TITLE,
    require: "any",
    showError: false,
    uiHandler: [ui],
  });

  const description = Skeletons.Textarea({
    className: `${pfx}-input message`,
    sys_pn: "mm-message",
    name: "mm-message",
    value: (m && m.message) || "",
    placeholder: LOCALE.DESCRIPTION_AGENDA,
    rows: 3,
    ignoreEnter: true,
    uiHandler: [ui],
  });

  // altInput shows d/m/Y; the named input keeps the Y-m-d value read on submit.
  const date = {
    kind: "date_picker",
    className: `${pfx}-date`,
    innerClass: `${pfx}-date-inner`,
    name: "mm-date",
    value: (m && m.date_ymd) || "",
    vendorOpt: {
      dateFormat: "Y-m-d",
      altInput: true,
      altFormat: "d/m/Y",
      appendTo: document.body,
    },
    uiHandler: [ui],
  };

  const timeInput = (nm, val) =>
    Skeletons.Element({
      tagName: "input",
      className: `${pfx}-time`,
      attrOpt: { type: "time", name: nm, value: val || "" },
    });

  const invitees = Skeletons.Box.Y({
    className: `${pfx}-invitees`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}-invitees-chips`,
        sys_pn: "mm-invitees-chips",
        partHandler: ui,
        kids: inviteesChips(ui, pfx),
      }),
      // Free/busy banner (warn-only) — filled by _checkAvailability.
      Skeletons.Note({
        className: `${pfx}-availability`,
        sys_pn: "mm-availability",
        partHandler: ui,
        content: "",
      }),
    ],
  });

  const recur = Skeletons.Box.Y({
    className: `${pfx}-recur`,
    sys_pn: "mm-recur",
    partHandler: ui,
    kids: recurRow(ui, pfx),
  });

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
          field(LOCALE.DESCRIPTION_AGENDA, description, "grow"),
          Skeletons.Box.X({
            className: `${pfx}-row`,
            kids: [
              field(LOCALE.DATE, date),
              field(LOCALE.START_TIME, timeInput("mm-stime", m && m.stime_hm)),
              field(LOCALE.END_TIME, timeInput("mm-etime", m && m.etime_hm)),
            ],
          }),
          field(LOCALE.REPEAT, recur),
          field(LOCALE.INVITEES, invitees),
        ],
      }),
      Skeletons.Box.X({ className: `${pfx}-footer`, kids: footerKids }),
    ],
  });
};

module.exports.inviteesChips = inviteesChips;
module.exports.recurRow = recurRow;
