# HANDOVER — Drumee session 2026-07-30 (từ Claude Code → Cursor agent)

> File này là toàn bộ context để agent tiếp theo chạy tiếp mà không cần lịch sử chat.
> KHÔNG commit file này vào repo. Trả lời user bằng **tiếng Việt**.

---

## 1. Quy trình bắt buộc (mọi repo)

- **Nhánh mới luôn tách từ `origin/preview`** → PR vào `preview` → merge → **merge `preview` vào `test`** rồi push (`test` là nhánh CD stage). KHÔNG bao giờ tự đụng `main`/prod khi chưa được yêu cầu.
- Stripe/billing chỉ làm trên **sandbox/stage**. Prod là Stripe account RIÊNG (price_id không dùng chéo được).
- Commit message kết thúc bằng `Co-Authored-By:` (tùy harness); PR body kết bằng chữ ký generated-with.
- User muốn được trả lời bằng tiếng Việt, code/comment tiếng Anh.

## 2. Repos (đều ở /Volumes/Data/drumee/)

| Repo | Vai trò | Ghi chú deploy |
|---|---|---|
| `ui-team` | FE chính (Backbone/Marionette + Skeletons JSON UI — KHÔNG viết HTML thô, xem CLAUDE.md + .claude/rules/) | `npm run dev` = watcher build + **tự rsync lên stage** → sau đó phải `ssh drumee.in "sudo drumee restart vudangnt"` để endpoint nhận bundle/locale mới. Watcher hay chết/kẹt pidfile: xoá `/var/folders/.../Volumes-Data-drumee-ui-team-drumee-ui-devel.pid` rồi chạy lại |
| `server-team` | BE chính | Stage endpoint `vudangnt`: rsync file vào `/srv/drumee/runtime/server/vudangnt/...` + restart (xem §4). CD: push `test` → deploy endpoint `main` stage; PROD = workflow_dispatch (`gh workflow run deploy.yml -f target=PROD`, build từ `preview`) |
| `schemas` | SQL procs | File mới PHẢI vào `patches/manifest.txt` (không thì không bao giờ chạy vào DB). Deploy stage: copy file vào `/home/vudangnt/schemas/...` rồi `sudo bin/patch-from-file <đường-dẫn-tương-đối> <target>` (target: yellow_page/drumate/hub/common). `yp` là DB CHUNG mọi endpoint |
| `admin-api` / `admin-console` | 2 plugin admin (repo GitHub: `drumee/admin-dash-server`, `drumee/admin-dash-ui`) | CD chỉ deploy endpoint `main`. Endpoint `vudangnt` dùng **bản copy riêng**: admin-api → rsync vào `/srv/drumee/runtime/plugins/server/vudangnt/admin-api/` + restart `vudangnt/service`; admin-console → `npm run stage` (build+sync vào `/srv/drumee/runtime/plugins/ui/vudangnt/admin-console/`) + `drumee restart vudangnt` |
| `marketplace` | plugin server (euroffice, versioning…) | bản stage: `/srv/drumee/runtime/plugins/server/vudangnt/marketplace/` |
| `loby` | OAuth/login backend | ít đụng |

## 3. Stage & tài khoản test

- SSH: `ssh drumee.in` (sudo được). Prod: `ssh drumee.in` → `ssh debian@app.drumee.org` → `sudo docker exec drumee ...`.
- Endpoint test của user: `https://drumee.in/-/vudangnt/` (org của user A ở vhost `paytest0724c.drumee.in`). Tester team dùng endpoint `main` (drumee.in chính + vhost org riêng).
- **PM2 có 2 daemon**: daemon www-data mới là thật — thao tác bằng `sudo -u www-data PM2_HOME=/srv/drumee/runtime/server/.pm2 pm2 <cmd>`. `sudo pm2` (root daemon) là SAI (từng tạo process trùng). Wrapper `sudo drumee restart <name>` dùng được cho restart thường. Logs: `/srv/drumee/runtime/server/.pm2/logs/` (vudangnt-service-out-<id>.log — id đổi khi recreate process, hiện ~80).
- Worker gdrive: pm2 `gdrive-worker`, script `/srv/drumee/runtime/server/vudangnt/offline/workers/gdriveWorker.js` (sửa importer → restart cả `gdrive-worker` lẫn `vudangnt/service`).

### Accounts (stage test — sandbox)
- A (owner org 18 "Pay Test 0724c"): `vudangnt@gmail.com` / `Admin@123!!!` (3 dấu !)
- B (owner org 9 "CS Team", vhost csteam0717): `cuocsongthanhbinh49@gmail.com` / `Admin@123!!!!!!` (**6 dấu !**)
- Admin-console test: `test.owner1@drumee.com`, `test.admin1@drumee.com` … / `test12345` (admin1 = role admin dom 1)
- Tester team: `lexis@drumee.org` (org 13), `linhht15.sic@gmail.com` (org 22), `vu@drumee.org` (member dom 1, quota pro legacy) — không có password.
- Stripe sandbox: thẻ `4242 4242 4242 4242`, exp `12/34`, cvc `123`. Trang Stripe có checkbox "I am an AI agent…" — tick khi agent tự thanh toán. Secret key đọc từ `yp.sys_conf` key `stripe_skey` (script node chạy trên server, xem pattern các script cũ).

## 4. Lệnh deploy nhanh (stage endpoint vudangnt)

```bash
# server-team file:
rsync file drumee.in:/tmp/x/ && ssh drumee.in "sudo install -o www-data -g www-data /tmp/x/FILE /srv/drumee/runtime/server/vudangnt/PATH && sudo drumee restart vudangnt/service"
# FE ui-team: (watcher đang chạy? nếu không: npm run dev &) → chờ manifest mới → sudo drumee restart vudangnt
# schemas proc:
ssh drumee.in: copy vào /home/vudangnt/schemas/... ; cd /home/vudangnt/schemas && sudo bin/patch-from-file yellow_page/procedures/.../x.sql yellow_page
```

## 5. Đã ship hôm nay/gần đây (tất cả đã merge preview → test)

Billing (chuỗi lớn):
- Mọi đổi plan đi qua **checkout** (bỏ hẳn in-place `change_plan` client) + popup copy chuẩn product (up/down/same-cycle-defer/cross-cycle) — ui-team #397/#401/#404/#411, server-team #132/#134/#136/#138/#139, schemas #96/#97.
- **Defer cycle-switch** (same plan đổi chu kỳ): giữ gói cũ, gói mới = Stripe **trial** đến hết hạn gói cũ → hôm nay $0. Mirror giờ giữ status `trialing` thật; banner FE: "Your Monthly/Yearly billing starts on {date}"; popup có câu giải thích "{N} days free = thời gian đã trả, credited".
- Giá yearly = **10×monthly** (2 tháng free): Stripe sandbox có price mới team $290/business $990 + `yp.plan` repoint; badge "Saved 16.5%"; checkout "2 months free". FE fallbacks 290/990/4990.
- Webhook supersede: chống wipe entitlement (guard hỏi Stripe + mirror), cross-customer (metadata.supersede_target), receipt email + modal "Payment Success!" hoạt động.
- `subscription_new` UNIQUE(entity_id); `yp.privilege` **UNIQUE(uid)** → 1 user = 1 domain (quan trọng khi nghĩ về membership).
- Admin console: org-wide member list/stats gộp **workspace collaborators** từ hub-side (`<hub_db>.hub_member_list` loop); `is_online` fix; upsell tách "plan thiếu" vs "thiếu quyền" (Admin access required, không nút Upgrade); link "Ask your organization owner →" → `admin.request_admin_access` (email + WS tới owner; org `owner_id='*'` → gửi mọi owner-bit). Topbar actions ẩn trên console/settings + khôi phục khi mở workspace (`workspace:focus`).
- GDrive migration: start pre-flight quyền nguồn (`SOURCE_ACCESS_REVOKED`), worker sentinel 30s dừng job khi mất quyền giữa chừng (`ACCESS_REVOKED`), nút **Cancel** sửa (pointerup delegate + skip re-render trùng + "Cancelling…") — ui-team #410/#413, server-team #138.
- Tasks: thời gian tạo cạnh Reporter; comment select/copy được (`user-select:text !important` + con) — ui-team #413.
- OAuth bounce khi edit doc: `overscroll-behavior-x:none` + history buffer sau OAuth referrer — ui-team #399. to-pdf ENOENT fix = ecosystem `vudangnt/service` env server_home (đã sửa /etc/drumee/infrastructure/ecosystem.json, backup .bak-20260729).
- Folder-first listing: đủ 3 lớp trên stage + prod server (user tự patch proc prod).

## 6. Đang chờ / việc mở

1. **Tester verify trên bản `test` mới** (CD main): case 1/2 cycle-switch (current card + banner starts-on + câu credited), invite counters (lexis/linhht), Cancel migration, task time/comment copy, swipe-back Google (cần swipe tay Mac), revoke-giữa-migrate (cần Google account thao tác share).
2. **PROD TODO khi go-live** (Stripe account prod, làm tay): tạo price yearly $290/$990 + repoint `yp.plan` prod; update product description Team/Business; (đã có sẵn script pattern trong lịch sử: reprice-yearly.js, product-desc.js — viết lại tương tự chạy trong docker prod).
3. **Content bảng giá**: các dòng Business "API access / SSO-SAML / Priority+SLA" là copy, CHƯA có backend — team product cần quyết.
4. Org 18 đang ở trạng thái defer thật (team/year active tới 30/07/2027 + team/month trialing bắt đầu sau đó) — đây là dữ liệu test, đừng "sửa" tưởng là bug.
5. Nếu billing page kẹt đè desk trong automation (breadcrumb "Home › Billing"), reload rồi thao tác; window hub đôi khi không mở bằng synthetic dblclick — dùng CDP click/snapshot.

## 7. Bẫy đã trả giá (đọc kỹ trước khi code)

- **LOCALE là safe-object trả CHÍNH KEY khi thiếu** → pattern `LOCALE.X || "fallback"` KHÔNG BAO GIỜ rơi vào fallback. Key mới phải thêm vào `ui-team/locale/*.json` (đủ 6 lang: en fr es ru km zh). Plugin admin-console dùng LOCALE của host (ui-team).
- Skeletons: `Box.X` = flex row, `Box.G` = grid — đổi loại là đổi display. Không set flex trong SCSS cho Box. Mọi text qua LOCALE. Icon qua sprite (`npm run build:icons`).
- `escapeContextmenu: 1` trên node skeleton = cho menu chuột phải native (framework mặc định chiếm contextmenu).
- Poll + full re-render nuốt click (element bị thay giữa mousedown/mouseup) → dùng pointerup delegate trên root + diff snapshot trước khi render.
- `await_func` (SQL FUNCTION) trả **string JSON** → phải parse. `await_proc` map null → '' (INT strict-mode reject) → truyền 0.
- mysql driver trả **BigInt** → `~~x` throw; dùng `Number(x)`.
- Webhook Stripe: 3 events (checkout.completed/created/invoice.paid) tới cùng giây, xử lý đua nhau → đừng tin mirror trong handler; hỏi Stripe hoặc so `created`.
- Bảng `quota`: UNIQUE(domain_id,payer_id) — domain có nhiều hàng (org row + hàng free cá nhân bị org_provision re-key) → mọi phép đếm phải chọn đúng hàng, đừng SUM.
- ui-team SCSS entry thật là `src/drumee/skin/index.scss` (KHÔNG phải src/sass/common.scss — cái đó ngoài build graph).
- Classifier có thể chặn lệnh sửa file hệ thống (/etc) hoặc DB write nhạy cảm → xin user chạy hoặc user gõ "cho phép".

## 8. Trạng thái repo lúc handover

Tất cả repo đang checkout `test`, sạch (mọi thay đổi đã commit + push). Nhánh feature đã xoá sau merge. Stage vudangnt đang chạy đúng bản mới nhất của mọi thứ ở §5.
