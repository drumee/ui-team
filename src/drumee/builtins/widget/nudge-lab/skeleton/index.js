/**
 * Nudge Lab skeleton — 3 numbered steps around a prediction banner.
 * Internal tester tool (devel module): Vietnamese-first literals on purpose,
 * matching the team its testers come from; scenario names keep the popup's
 * own English words so what you click is what you'll read on the popup.
 */
const { filesize } = require("@drumee/ui-essentials");

const TRIGGER_LABEL = {
  storage_70: "Storage 70% (amber)",
  storage_80: "Storage 80% (amber)",
  storage_90: "Storage 90% (đỏ)",
  seats_70: "Seats ~75% (amber)",
  seats_90: "Seats 100% (đỏ)",
  age_14d: "Duration — 2 weeks",
  age_30d: "Duration — 1 month",
};

function banner(fig, ui) {
  const p = ui.predict();
  let cls = "warn";
  let head = "";
  let sub = "";
  if (p.show) {
    cls = "ok";
    const s = ui.state();
    // client-side mirror of the server ladder (seats on Free sells Team)
    const target = s.scope === "org"
      ? (s.plan === "team" ? "BUSINESS" : "TEAM")
      : (p.family === "seats" ? "TEAM" : (s.plan === "pro" ? "TEAM" : "PRO"));
    head = `Mở desk mới bây giờ → popup HIỆN: ${TRIGGER_LABEL[p.trigger] || p.trigger} — mời nâng cấp lên ${target}`;
    sub = "Bấm nút xanh ở Bước 3, đợi ~15 giây sau khi desk load xong.";
  } else if (p.reason === "no-trigger") {
    cls = "idle";
    head = "Mở desk bây giờ → KHÔNG có popup (chưa kịch bản nào đủ điều kiện)";
    sub = "Chọn một kịch bản ở Bước 1 trước.";
  } else if (p.reason === "daily-cap") {
    cls = "block";
    head = "KHÔNG hiện — hôm nay (UTC) account này đã dùng lượt popup";
    sub = "Bấm “New day” (giữ lịch sử) hoặc “Reset” (xoá hết) ở Bước 2 rồi mở desk lại.";
  } else if (p.reason === "all-seen") {
    cls = "block";
    head = `KHÔNG hiện — ngưỡng ${TRIGGER_LABEL[p.trigger] || p.trigger} đã xem rồi (mỗi ngưỡng chỉ hiện 1 lần)`;
    sub = "Bấm “Reset” ở Bước 2, hoặc chọn ngưỡng khác chưa xem.";
  } else {
    cls = "idle";
    head = "Chưa đọc được trạng thái";
    sub = "Bấm “Đọc lại trạng thái” bên dưới.";
  }
  return Skeletons.Box.Y({
    className: `${fig}__banner ${fig}__banner--${cls}`,
    kids: [
      Skeletons.Note({ className: `${fig}__banner-head`, content: head }),
      Skeletons.Note({ className: `${fig}__banner-sub`, content: sub }),
    ],
  });
}

function chips(fig, s) {
  const seen = (s.block && s.block.seen) || {};
  const seenList = Object.keys(seen);
  const today = new Date().toISOString().slice(0, 10);
  const capUsed = !!(s.block && s.block.last_shown && s.block.last_shown[s.uid] === today);
  const items = [
    ["Account", s.scope === "org" ? "Org" : "Cá nhân"],
    ["Plan", (s.plan || "?").toUpperCase()],
    ["Storage", s.disk_limit ? `${filesize(s.disk_used || 0, { round: 1 })}/${filesize(s.disk_limit, { round: 0 })} · ${s.disk_pct}%` : "?"],
    ["Seats", s.seat_limit ? `${s.seats_used}/${s.seat_limit}` : `${s.seats_used}/∞`],
    ["Tuổi", `${s.age_days} ngày`],
    ["Đã xem", seenList.length ? seenList.join(", ") : "chưa gì"],
    ["Lượt hôm nay", capUsed ? "ĐÃ DÙNG" : "còn"],
  ];
  return Skeletons.Box.X({
    className: `${fig}__chips`,
    kids: items.map(([k, v]) =>
      Skeletons.Box.X({
        className: `${fig}__chip`,
        kids: [
          Skeletons.Note({ className: `${fig}__chip-key`, content: k }),
          Skeletons.Note({ className: `${fig}__chip-val`, content: String(v) }),
        ],
      })
    ),
  });
}

function button(fig, ui, svc, name, label, opts = {}) {
  const cls = [
    `${fig}__btn`,
    opts.active ? `${fig}__btn--active` : "",
    opts.primary ? `${fig}__btn--primary` : "",
    ui.busy() ? `${fig}__btn--busy` : "",
  ].filter(Boolean).join(" ");
  return Skeletons.Box.X({
    className: cls,
    service: svc,
    scenario: name,
    uiHandler: [ui],
    kids: [Skeletons.Note({ className: `${fig}__btn-label`, active: 0, content: label })],
  });
}

module.exports = function (ui) {
  const fig = ui.fig.family;
  const s = ui.state();

  if (s && ~~s.enabled === 0) {
    return Skeletons.Box.Y({
      className: `${fig}__wrap`,
      kids: [
        Skeletons.Note({ className: `${fig}__title`, content: "Nudge Lab" }),
        Skeletons.Note({ className: `${fig}__hint`, content: "Đang tắt ở server này (cờ nudge_lab)." }),
      ],
    });
  }

  const pct = Number(s.disk_pct) || 0;
  const seatPct = ~~s.seat_limit > 0 ? (100 * ~~s.seats_used) / ~~s.seat_limit : 0;
  const age = ~~s.age_days;

  const kids = [
    Skeletons.Note({ className: `${fig}__title`, content: "Nudge Lab — test popup nâng cấp gói" }),
    s.error ? Skeletons.Note({ className: `${fig}__error`, content: String(s.error) }) : null,

    banner(fig, ui),
    chips(fig, s),

    // ── Bước 1 ───────────────────────────────────────────────────────────
    Skeletons.Box.Y({
      className: `${fig}__step`,
      kids: [
        Skeletons.Note({ className: `${fig}__step-title`, content: "① Chọn kịch bản (dữ liệu của CHÍNH account này được chỉnh)" }),
        Skeletons.Box.Y({
          className: `${fig}__rows`,
          kids: [
            Skeletons.Box.X({
              className: `${fig}__row`,
              kids: [
                Skeletons.Note({ className: `${fig}__row-label`, content: "Storage" }),
                button(fig, ui, "nudge-lab-scenario", "storage_70", "70% · amber", { active: pct >= 70 && pct < 80 }),
                button(fig, ui, "nudge-lab-scenario", "storage_80", "80% · amber", { active: pct >= 80 && pct < 90 }),
                button(fig, ui, "nudge-lab-scenario", "storage_90", "90% · đỏ", { active: pct >= 90 }),
                button(fig, ui, "nudge-lab-scenario", "storage_low", "về 0", { active: pct < 70 }),
              ],
            }),
            Skeletons.Box.X({
              className: `${fig}__row`,
              kids: [
                Skeletons.Note({ className: `${fig}__row-label`, content: "Seats" }),
                button(fig, ui, "nudge-lab-scenario", "seats_70", "~75% · amber", { active: seatPct >= 70 && seatPct < 90 }),
                button(fig, ui, "nudge-lab-scenario", "seats_90", "100% · đỏ", { active: seatPct >= 90 }),
                button(fig, ui, "nudge-lab-scenario", "seats_off", "trả lại", { active: ~~s.seat_limit > 0 && seatPct < 70 }),
              ],
            }),
            Skeletons.Box.X({
              className: `${fig}__row`,
              kids: [
                Skeletons.Note({ className: `${fig}__row-label`, content: "Tuổi ws" }),
                button(fig, ui, "nudge-lab-scenario", "age_14d", "2 tuần", { active: age >= 14 && age < 30 }),
                button(fig, ui, "nudge-lab-scenario", "age_30d", "1 tháng", { active: age >= 30 }),
                button(fig, ui, "nudge-lab-scenario", "age_reset", "ngày thật", { active: age < 14 }),
              ],
            }),
            Skeletons.Box.X({
              className: `${fig}__row`,
              kids: [
                Skeletons.Note({ className: `${fig}__row-label`, content: "Plan" }),
                ...(s.scope === "org"
                  ? [
                      button(fig, ui, "nudge-lab-scenario", "plan_restore", "TEAM — popup mời lên Business", { active: s.plan === "team" }),
                      button(fig, ui, "nudge-lab-scenario", "plan_up", "BUSINESS — hết bậc, không popup", { active: s.plan === "business" }),
                    ]
                  : [
                      button(fig, ui, "nudge-lab-scenario", "plan_restore", "FREE — popup mời lên Pro (seats mời Team)", { active: s.plan === "free" }),
                      button(fig, ui, "nudge-lab-scenario", "plan_up", "PRO — popup mời lên Team", { active: s.plan === "pro" }),
                    ]),
              ],
            }),
          ],
        }),
        Skeletons.Box.X({
          className: `${fig}__toggle`,
          service: "nudge-lab-toggle-autoreset",
          uiHandler: [ui],
          kids: [
            Skeletons.Note({
              className: `${fig}__toggle-box`,
              active: 0,
              content: ui.autoReset() ? "☑" : "☐",
            }),
            Skeletons.Note({
              className: `${fig}__toggle-label`,
              active: 0,
              content: "Tự Reset lịch sử popup sau khi chọn (khuyên dùng — tắt đi khi muốn test luật once-per-threshold / daily cap)",
            }),
          ],
        }),
      ],
    }),

    // ── Bước 2 ───────────────────────────────────────────────────────────
    Skeletons.Box.Y({
      className: `${fig}__step`,
      kids: [
        Skeletons.Note({ className: `${fig}__step-title`, content: "② Luật hiển thị (chỉ cần khi banner báo KHÔNG hiện)" }),
        Skeletons.Box.X({
          className: `${fig}__row`,
          kids: [
            button(fig, ui, "nudge-lab-gate", "new_day", "New day — bỏ giới hạn 1 popup/ngày, GIỮ lịch sử đã xem"),
            button(fig, ui, "nudge-lab-gate", "reset", "Reset — xoá hết, ngưỡng nào cũng hiện lại được"),
            button(fig, ui, "nudge-lab-gate", "cleanup", "Cleanup — trả mọi thứ về nguyên trạng"),
          ],
        }),
      ],
    }),

    // ── Bước 3 ───────────────────────────────────────────────────────────
    Skeletons.Box.Y({
      className: `${fig}__step`,
      kids: [
        Skeletons.Note({ className: `${fig}__step-title`, content: "③ Xem popup" }),
        Skeletons.Box.X({
          className: `${fig}__footer`,
          kids: [
            button(fig, ui, "nudge-lab-open-desk", "", "Mở desk (tab mới) → đợi ~15 giây", { primary: true }),
            button(fig, ui, "nudge-lab-refresh", "", "Đọc lại trạng thái"),
          ],
        }),
      ],
    }),
  ];

  return Skeletons.Box.Y({ debug: __filename, className: `${fig}__wrap`, kids });
};
