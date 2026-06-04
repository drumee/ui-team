# Bundle Upload (multi file/folder hỗn hợp) — Design Spec

- **Date:** 2026-06-02
- **Status:** Draft for review
- **Scope:** Frontend only (`ui-team`). No server changes.
- **Author:** brainstorming session (Vu Dang + Claude)

---

## 1. Mục tiêu

Cho phép người dùng upload **một tập hỗn hợp file + folder** trong workspace như một "bundle":
gom nhiều nguồn vào một khay (tray), xem **tiến trình tổng + gom nhóm theo folder**, xử lý
**xung đột trùng tên một lần** cho cả bundle.

Cơ chế truyền tải: **upload tuần tự từng file**; gặp folder thì **tạo folder trước
(`media.make_dir`) rồi upload tiếp các file/subfolder bên trong** (đệ quy). Tận dụng các
service server đã có (`media.upload`, `media.make_dir`) — **không thêm/sửa server**.

### Vì sao cần
- Nút Upload hiện tại render `<input type="file" multiple>` → **chỉ chọn được file, không chọn
  được folder** ([file-selector/index.js:12](../../../node_modules/@drumee/ui-core/letc/widgets/file-selector/index.js#L12)).
- Trình duyệt **không cho chọn lẫn file + folder trong cùng một hộp thoại picker** (`<input>` chỉ
  hỗ trợ `multiple` *hoặc* `webkitdirectory`). Tuyển chọn hỗn hợp chỉ đạt được qua **drag-drop**
  hoặc bằng cách **cộng dồn nhiều lần chọn** vào một khay.
- Cửa sổ tiến trình hiện tại là danh sách phẳng, chỉ lưu `fileName` → mất cấu trúc đường dẫn, hai
  file `index.js` ở hai folder khác nhau bị coi là trùng ([upload-progress/index.js:327](../../src/drumee/builtins/window/upload-progress/index.js#L327)).

---

## 2. Phạm vi

### Trong phạm vi (frontend `ui-team`)
- Bundle tray: pha **staging** (gom item) + pha **progress** (theo dõi), mở rộng từ
  [upload-progress window](../../src/drumee/builtins/window/upload-progress/index.js).
- 3 nguồn nạp vào bundle: **Add files** (`<input multiple>`), **Add folder**
  (`<input webkitdirectory>`), **drag-drop** hỗn hợp (đã có `dataTransfer`).
- Orchestrator đệ quy phía client: file tuần tự; folder → `make_dir` rồi upload con.
- Client job manager: **tối đa 3 bundle (job) chạy song song** mỗi user.
- Throttle throughput **~100 MB/s aggregate** (gần đúng, pacing ở mức bắt đầu mỗi file).
- Xung đột trùng tên: quyết định **bulk** (Replace all / Rename all / Skip all).
- Chỉ áp dụng trong **workspace/folder window**.

### Ngoài phạm vi (YAGNI)
- ❌ Không thêm service server (`media.batch_upload`, manifest, dedup md5 server-side).
- ❌ Không atomic transaction / rollback.
- ❌ Không chunked/resumable upload.
- ❌ Không tích hợp chat, share/dmz (chỉ workspace).
- ❌ Không File System Access API.
- ❌ Không throttle/job-limit phía server (mọi giới hạn enforce ở client, gần đúng).

---

## 3. Hiện trạng (đã điều tra)

Đường upload hiện có (xem chi tiết §11 — file tham chiếu):
- Drag-drop hỗn hợp **đã hoạt động**: `_sendTo` tạo `pseudo_media` cho cả `files[]` lẫn `folders[]`
  ([mfs.js:175](../../../node_modules/@drumee/ui-core/letc/mfs.js#L175)) → `insertMedia` → mỗi
  pseudo tự upload đúng nhánh `_shouldUploadFile`/`_shouldUploadFolder`
  ([core.js:1054](../../src/drumee/builtins/media/core.js#L1054)).
- Folder hiện upload qua `uploadFolder` walk cây bằng `readEntries`, dựa vào `ownpath` để **server
  tự tạo cây cha** ([core.js:836](../../src/drumee/builtins/media/core.js#L836)); empty folder
  tạo cuối bằng vòng lặp `make_dir` ([core.js:716](../../src/drumee/builtins/media/core.js#L716)).
- Queue `media_uploader` dùng `setInterval(spool, 200ms)` khởi động thêm 1 XHR mỗi tick, **không
  có trần concurrency** ([uploader/index.js:29](../../src/drumee/builtins/media/uploader/index.js#L29)).
- Transport: `uploadFile(file, opt)` — 1 XHR/file, metadata trong header `x-param-xia-data`
  ([@drumee/ui-essentials/socket/upload.js](../../../node_modules/@drumee/ui-essentials/socket/upload.js)).
- `media.make_dir` server trả về node folder mới (proc `mfs_make_dir`)
  ([server media.js:122](../../../../server-team/service/media.js#L122)).

**Khác biệt chính so với hiện trạng:** thay cách "dựa `ownpath` để server tạo cây" bằng
**client tự `make_dir` từng folder để lấy `nid` thật, rồi upload con vào `nid` đó**. Điều này đơn
giản hoá xử lý, bỏ được vòng lặp empty-folder cuối, và cho client tiến trình "đang tạo folder…".

---

## 4. Kiến trúc (frontend-only)

```
┌─────────────────────────── ui-team (client) ───────────────────────────┐
│                                                                          │
│  Workspace Upload button ─► BundleTray (staging)                         │
│     Add files / Add folder / drag-drop ─► entry tree (in-memory)         │
│                                   │ "Upload all"                         │
│                                   ▼                                      │
│   BundleManager (singleton)  ── ≤ 3 BundleJob đồng thời ──┐              │
│        │  ThroughputGovernor (~100 MB/s aggregate)        │              │
│        ▼                                                  ▼              │
│   BundleJob (recursive orchestrator)                                     │
│     file  → uploadFile(file → destNid)        (tuần tự)                  │
│     folder→ make_dir(name, destNid) → nid' → đệ quy con vào nid'         │
│        │  events: progress / file-done / folder-created / error         │
│        ▼                                                                 │
│   BundleTray (progress)  ◄── aggregate % + bytes + ETA + grouping       │
│                                                                          │
│  Reused: media.upload, media.make_dir, uploadFile transport, checkQuota  │
└──────────────────────────────────────────────────────────────────────┘
```

### Thành phần
| Thành phần | Vai trò | Vị trí (đề xuất) |
|---|---|---|
| **BundleTray** | UI staging + progress, gom nhóm theo folder | mở rộng `window/upload-progress/` |
| **BundleManager** | Singleton; xếp hàng & chạy ≤3 job; sở hữu ThroughputGovernor | `media/bundle/manager.js` (mới) |
| **BundleJob** | Orchestrator đệ quy 1 bundle; phát event tiến trình | `media/bundle/job.js` (mới) |
| **ThroughputGovernor** | Đo tốc độ aggregate, gate thời điểm bắt đầu file kế | `media/bundle/governor.js` (mới) |
| **Transport (reuse)** | `uploadFile` (1 XHR/file) + `postService(make_dir)` | đã có |

Lý do tách module mới thay vì sửa `media_uploader`: bundle tách rời khỏi một widget folder cụ thể
(pseudo_media/destination), cần orchestrator độc lập có thể đan xen `make_dir` + upload tuần tự;
`media_uploader` hiện chỉ enqueue file. Module mới **dùng lại transport cấp thấp** để tránh trùng
lặp logic, và **không động vào** đường drag-drop trực tiếp hiện có (giữ tương thích ngược).

---

## 5. Thiết kế chi tiết

### 5.1 Mô hình dữ liệu — entry tree (in-memory)
Mỗi mục trong bundle là một `BundleEntry`:
```
BundleEntry = {
  id:        string,            // uid nội bộ để render/cập nhật
  kind:      "file" | "folder",
  name:      string,            // tên hiển thị
  relpath:   string,            // đường dẫn tương đối trong bundle (để gom nhóm + hiển thị)
  size:      number,            // file: byte; folder: tổng size con (tính khi nạp)
  source:    File | FileSystemFileEntry | FileSystemDirectoryEntry,
  children:  BundleEntry[],     // chỉ folder
  status:    "queued" | "creating" | "uploading" | "done" | "skipped" | "error",
  error?:    string,
}
```
- **Add files**: mỗi `File` → entry `file` ở gốc bundle.
- **Add folder** (`webkitdirectory`): `e.target.files` có `webkitRelativePath` → dựng lại cây
  `folder`/`file` từ các đoạn path.
- **drag-drop**: `dataTransfer(e)` trả `{files[], folders[]}`; folder entry dùng `readEntries`
  (đệ quy, lười — có thể walk khi nạp để đếm size, hoặc walk khi upload).
- Bỏ qua `IGNORED_FILES` (`.DS_Store`, `__MACOSX`) như hiện tại ([core.js:11](../../src/drumee/builtins/media/core.js#L11)).

### 5.2 Staging UI (pha 1)
- Mở khay khi bấm nút Upload ở workspace (thay vì mở picker file ngay).
- Header: **Add files** / **Add folder** / vùng **drop**.
- Thân: danh sách **gom nhóm theo folder**, collapsible; mỗi dòng hiện **relpath** + size; nút xoá
  từng entry và xoá cả folder.
- Footer: tổng số file + tổng dung lượng; nút **Upload all** / **Clear**.
- Có thể tiếp tục Add nhiều lần trước khi Upload (giải quyết giới hạn không-mix-trong-1-dialog).

### 5.3 Thuật toán orchestrator đệ quy (BundleJob)
```
async uploadEntry(entry, destNid):
  if entry.kind == "file":
      await governor.gateBeforeFile(entry.size)     // §5.5 pacing
      entry.status = "uploading"
      await uploadFile(entry.source → { nid: destNid, ...conflictResolution })
      entry.status = "done"
  else: // folder
      entry.status = "creating"
      // Hợp đồng đã xác nhận: client gọi make_dir với { hub_id, nid: destNid, socket_id, dirname }
      // (xem core.js:1939). Server trả node folder mới có .nid (media.js:145,176).
      const node = await postService(SERVICE.media.make_dir, {
                      hub_id, nid: destNid, socket_id, dirname: entry.name })
      const newNid = node.nid
      entry.status = "uploading"
      for child of entry.children (đệ quy):
          await uploadEntry(child, newNid)          // tuần tự, chờ xong mới sang con kế
      entry.status = "done"
```
- **Tuần tự**: dùng `await` để mỗi file/`make_dir` chờ xong mới sang bước kế trong cùng job.
- **Folder rỗng** vẫn được tạo (vì `make_dir` chạy trước, độc lập với có con hay không).
- **destNid gốc** = `getCurrentNid()` của folder window đang mở.

### 5.4 Concurrency — BundleManager (≤ 3 job/user)
- Singleton client-side. `enqueue(job)` đưa job vào hàng đợi; chạy tối đa **3 job đồng thời**;
  job thứ 4+ ở trạng thái **"queued"** (tray hiển thị "Đang chờ…").
- Khi một job kết thúc (done/cancel/error) → khởi chạy job kế trong hàng đợi.
- Vì mỗi job upload **tuần tự**, tối đa **3 XHR đồng thời** toàn cục phía user.

### 5.5 Throughput governor (~100 MB/s aggregate, gần đúng)
- Một governor **dùng chung** cho cả 3 job (đo aggregate).
- **Rate meter**: cộng dồn `bytes` từ sự kiện `onUploadProgress` của mọi XHR đang chạy trong cửa sổ
  trượt ~1s → tính `MB/s` hiện tại.
- **Gate ở mức file**: trước khi BundleJob bắt đầu file kế, gọi `governor.gateBeforeFile()`:
  nếu rate đo được ≥ 100 MB/s → chờ (poll ~100ms) đến khi tụt dưới ngưỡng rồi mới gửi.
- **Hạn chế (đã chấp nhận):** không pace được *giữa chừng* một XHR đang chạy (file đơn rất lớn có
  thể vượt ngưỡng tạm thời). Đây là xấp xỉ ở mức bắt đầu file — đủ tốt cho phần lớn bundle nhiều file.

### 5.6 Xung đột trùng tên (bulk, client-side)
- Chính sách quyết **up-front** bằng một **toggle "Replace existing"** ở khay staging (bulk cho cả
  bundle) — tránh phải liệt kê tên ở thư mục đích (window **không** có `_nameExists`; method đó nằm
  trên media item [core.js:1875](../../src/drumee/builtins/media/core.js#L1875)).
  - Toggle **OFF (mặc định)** → `mode:"rename"`: server tự append-timestamp khi trùng tên (hành vi sẵn có).
  - Toggle **ON** → `mode:"replace"`: gửi `replace=1`, server ghi đè.
- Folder trùng tên (v1 thực tế — **KHÔNG merge**): client gọi `make_dir` với `dirname` (không kèm
  `ownpath`), server đi qua `ensureCreateNode` → khi trùng tên sẽ **append-timestamp** tạo folder mới
  (`name-YYYY-MM-DD@hh:mm:ss`), KHÔNG gộp vào folder cũ ([server media.js ~814](../../../../server-team/service/media.js)).
  Con vẫn vào đúng folder vừa tạo (job dùng `nid` trả về) nên không mất dữ liệu, chỉ là tạo folder
  thứ hai thay vì merge. Đây là hành vi chấp nhận cho v1.
  - **Nâng cấp tương lai để merge:** gọi `make_dir` theo `ownpath` (route vào `ensureMakeDir`, vốn merge),
    hoặc thêm dialog reactive chỉ-khi-trùng (cần liệt kê tên đích từ media-list của folder window).

### 5.7 Progress & grouping UI (pha 2)
- **Thanh tiến trình tổng**: `% = bytesUploaded / bytesTotal`, kèm tổng bytes và **ETA** suy từ rate.
- **Per-folder grouping**: mỗi folder là một nhóm collapsible với tiến trình nhóm; per-file bên trong.
- **Trạng thái dòng**: queued / creating folder… / uploading (x%) / done / skipped / error.
- **Điều khiển**: Cancel all (abort mọi XHR + dừng job), retry các file `error`.
- Tận dụng hạ tầng sự kiện `RADIO_MEDIA` đã có trong upload-progress window
  ([upload-progress/index.js:88](../../src/drumee/builtins/window/upload-progress/index.js#L88)),
  bổ sung event cấp bundle (`bundle:progress`, `bundle:folder-created`, `bundle:done`).

### 5.8 Hủy / lỗi / dọn dẹp
- **Cancel**: abort XHR đang chạy của job, đặt cờ hủy để dừng đệ quy ở bước kế; folder đã tạo vẫn
  giữ (không rollback — đúng phạm vi non-atomic).
- **Lỗi file**: retry tối đa N (mặc định 2, theo hành vi hiện tại), sau đó đánh `error` và **tiếp
  tục** file kế (không dừng cả job).
- **Lỗi make_dir**: đánh folder `error`, **bỏ qua** cây con của folder đó (không thể upload con khi
  không có nid), tiếp tục các entry khác.
- **Quota**: kiểm tra `checkQuota`/`Visitor.diskFree()` trước khi bắt đầu (như hiện tại,
  [uploader/index.js:257](../../src/drumee/builtins/media/uploader/index.js#L257)); nếu thiếu chỗ →
  báo lỗi trước khi chạy.

---

## 6. Giao diện module (interface)

```
// media/bundle/manager.js  (singleton)
BundleManager.enqueue(job: BundleJob): void          // chạy hoặc xếp hàng (≤3)
BundleManager.activeCount(): number
BundleManager.governor: ThroughputGovernor

// media/bundle/job.js
new BundleJob({ entries: BundleEntry[], destNid, hub_id, resolution })
job.start(): Promise<void>                            // chạy orchestrator đệ quy
job.cancel(): void
job.on("progress"|"file-done"|"folder-created"|"error"|"done", cb)

// media/bundle/governor.js
governor.report(bytesDelta: number): void            // gọi từ onUploadProgress
governor.gateBeforeFile(size?: number): Promise<void> // chờ đến khi rate < 100MB/s
governor.currentRate(): number                       // MB/s
```

---

## 7. Edge cases
- **Cây sâu/rộng**: walk `readEntries` đệ quy có thể nặng; nạp size khi staging có thể block UI →
  cân nhắc đếm size lười hoặc hiển thị "đang quét…".
- **Nhiều file (100+)**: render danh sách lớn — dùng list ảo/cuộn của upload-progress hiện có.
- **Trùng tên file vs folder cùng tên**: theo logic `_shouldUploadFile` hiện tại (folder tồn tại →
  INSERT, file tồn tại → REPLACE/DUPLICATE) nhưng áp dụng bulk.
- **Mất mạng giữa bundle**: file đang chạy fail → retry; các file/`make_dir` chưa chạy vẫn nằm trong
  job, có thể retry thủ công. Không resume tự động (ngoài phạm vi).
- **Browser khác nhau**: `webkitdirectory`, `multiple`, drag-drop `webkitGetAsEntry` đều chạy trên
  Chrome/Edge/Firefox/Safari hiện đại → tray hoạt động mọi nơi.

---

## 8. Files dự kiến thay đổi (frontend)
**Mới**
- `src/drumee/builtins/media/bundle/manager.js` — BundleManager singleton.
- `src/drumee/builtins/media/bundle/job.js` — BundleJob orchestrator đệ quy.
- `src/drumee/builtins/media/bundle/governor.js` — ThroughputGovernor.
- (tùy chọn) `src/drumee/builtins/media/bundle/entry.js` — dựng/đếm entry tree từ 3 nguồn.

**Sửa**
- `src/drumee/builtins/window/upload-progress/index.js` + `skeleton/*` — thêm pha staging,
  grouping theo folder, thanh tiến trình tổng, trạng thái "creating folder".
- Entry point nút Upload ở workspace (`window/manager.js` `handleUpload`/`upload`
  [manager.js:137](../../src/drumee/builtins/window/manager.js#L137) và/hoặc folder window) → mở
  BundleTray staging thay vì picker file trực tiếp.
- `locale/en.json` (+ các locale khác) — chuỗi mới (Add files/folder, Upload all, Replace/Rename/Skip
  all, "Đang chờ…", "Đang tạo thư mục…", ETA…).

**Dùng lại (không sửa)**
- `media.upload`, `media.make_dir` (server) — không đổi.
- `uploadFile` transport, `checkQuota`, `dataTransfer`.

---

## 9. Kế hoạch kiểm thử (thủ công — repo không có test runner)
1. **Add files**: chọn nhiều file → staging hiển thị đúng số/size → Upload all → tất cả lên đúng
   thư mục đích, tiến trình tổng chạy tới 100%.
2. **Add folder**: chọn 1 folder nhiều cấp → cây tái dựng đúng → upload tạo đúng cấu trúc; **folder
   rỗng vẫn được tạo**.
3. **Hỗn hợp**: Add files + Add folder + drag-drop cùng một bundle → tất cả gom đúng nhóm, upload đủ.
4. **Tuần tự**: quan sát network — trong 1 job chỉ 1 file lên tại một thời điểm.
5. **3 job**: mở 3 bundle → chạy song song; bundle thứ 4 ở "Đang chờ…", tự chạy khi 1 job xong.
6. **Throttle**: bundle nhiều file → rate aggregate dao động quanh ~100 MB/s (gần đúng).
7. **Xung đột**: upload trùng tên → 1 hộp thoại bulk → Replace/Rename/Skip áp dụng đúng cho cả loạt.
8. **Cancel/retry**: hủy giữa chừng dừng đúng; file lỗi retry được.
9. **Quota**: vượt quota → chặn trước khi chạy, báo lỗi rõ.

---

## 10. Rủi ro & quyết định mở
- **Throttle client gần đúng**: chỉ gate ở mức bắt đầu file; file đơn rất lớn có thể vượt ngưỡng tạm
  thời. Đã chấp nhận (không chunk).
- **Hai đường upload song song tồn tại** (bundle mới vs drag-drop trực tiếp cũ): chấp nhận để không
  destabilize; giảm trùng lặp bằng cách dùng chung transport cấp thấp.
- **Đếm size khi staging** có thể chậm với cây lớn → hiển thị trạng thái quét; cân nhắc lười.
- ~~make_dir response shape~~ **(đã xác nhận)**: `media.make_dir({ hub_id, nid: parentNid, socket_id, dirname })`
  trả node folder mới có `.nid` ([client core.js:1939](../../src/drumee/builtins/media/core.js#L1939),
  [server media.js:145](../../../../server-team/service/media.js#L145)). Con upload vào `nid` này.
- **Tray singleton chia sẻ part `file-list` với luồng upload trực tiếp (legacy).** Bundle render qua
  `_renderProgressList`, legacy qua `_renderFileList`, cùng `sys_pn:"file-list"`. Nếu một bundle đang
  chạy/staging mà có upload kéo-thả trực tiếp tới (hoặc ngược lại) trong cùng cửa sổ singleton, hai bộ
  render có thể đè nhau và phase `staging` ẩn `file-list`/`aggregate`. v1 không xử lý đồng thời chéo
  luồng trong một cửa sổ; nâng cấp: dùng part riêng (`bundle-list`) cho bundle.
- **v1 hiển thị một bundle/job tại một thời điểm trong tray** (`this._job` bị ghi đè). `BundleManager`
  vẫn enforce trần 3 job như hạ tầng. Render nhiều job-group song song là nâng cấp tương lai (đổi
  `this._job` → `this._jobs[]`, staging thành overlay).
- **Sau khi bundle xong, `_bundle` không tự xoá** (giữ để hiển thị kết quả); cờ `_uploading` chặn bấm
  "Upload all" lần hai. Người dùng bấm **Clear** rồi stage lại cho bundle kế. Tự reset/auto re-stage là
  nâng cấp UX tương lai.

---

## 11. Tham chiếu mã nguồn
- `node_modules/@drumee/ui-core/letc/widgets/file-selector/index.js:12` — picker `<input multiple>`.
- `node_modules/@drumee/ui-core/letc/mfs.js:175` — `_sendTo` (drag-drop xử lý files+folders).
- `src/drumee/builtins/media/core.js:836` — `uploadFolder` (walk cây hiện tại, dựa ownpath).
- `src/drumee/builtins/media/core.js:716` — vòng lặp tạo empty folder cuối (sẽ thay bằng make_dir-trước).
- `src/drumee/builtins/media/core.js:1875` — `_nameExists` (đối chiếu xung đột).
- `src/drumee/builtins/media/uploader/index.js:29` — spool 200ms ramp không trần (đường cũ, không dùng cho bundle).
- `src/drumee/builtins/media/uploader/index.js:257` — `checkQuota`.
- `node_modules/@drumee/ui-essentials/socket/upload.js` — `uploadFile` transport.
- `src/drumee/builtins/window/upload-progress/index.js:88` — listener `RADIO_MEDIA`.
- `server-team/service/media.js:122` — `make_dir` (server, dùng lại, không sửa).
