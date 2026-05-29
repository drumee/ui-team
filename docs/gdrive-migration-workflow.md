# Google Drive Migration — Workflow

> Import file/folder từ Google Drive vào Drumee workspace.
> Tài liệu cho team (PO, FE, BE, QA) — Mermaid render trực tiếp trên GitHub/GitLab.
> Phản ánh hiện trạng code **sau loạt fix 2026-05-29** (OAuth/upsert, reconnect, re-migrate, async I/O).

---

## 0. Bức tranh tổng thể

```mermaid
flowchart LR
    subgraph Onboarding
        A[User chọn chip<br/>Google Drive] --> B[profile.tools<br/>= google_drive]
    end

    subgraph Desk
        B --> C{Auto-launch<br/>sau 1.5s?}
        C -->|tools có gdrive<br/>& chưa skip| D[Popup mở]
        C -->|đã skip| Z[Không hiện]
        S[Settings → Linked accounts<br/>row hiện trạng-thái get_state] -->|launch thủ công| D
    end

    subgraph "Frontend (popup state machine)"
        D --> E[checking]
        E -->|get_state| G[ready]
        E -->|get_state| F[not-connected]
        E -->|get_state: job running| H[in-progress<br/>reconnect]
        E -->|get_state: job done chưa xem| I[result 1 lần]
        F -->|OAuth elevation| G
        G -->|Start| H
        H --> I
        I -->|Migrate again| G
    end

    subgraph "Backend"
        G -.->|connect| OA[OAuth elevation<br/>email+profile+drive.readonly]
        H -.->|start_migration<br/>dedup guard| Q[(Bull queue<br/>drumee:migration)]
        E -.->|get_state| GUJ[getUserJob uid<br/>quét Bull theo user]
        Q --> W[gdrive-worker<br/>importer async I/O]
        W -.->|download + mfs_create_node| MFS[(Drumee MFS<br/>hub storage)]
        W -.->|Drive API| GD[(Google Drive)]
    end

    style A fill:#e8f0fe
    style MFS fill:#e6f4ea
    style GD fill:#fef7e0
    style Q fill:#fce8e6
```

---

## 1. End-to-end sequence (happy path)

```mermaid
sequenceDiagram
    autonumber
    actor U as User
    participant P as Popup (FE)
    participant GS as google_drive<br/>(endpoint)
    participant BT as butler<br/>(OAuth callback)
    participant DB as oauth_accounts / profile
    participant Q as Bull queue
    participant WK as gdrive-worker
    participant GD as Google Drive
    participant MFS as Drumee MFS

    Note over U,P: Onboarding đã set profile.tools=[google_drive]
    U->>P: Mở popup (Desk auto-launch / Settings)
    P->>GS: get_state {hub_id}
    GS->>Q: getUserJob(uid) — quét Bull theo user
    GS->>DB: scope/refresh_token + profile.gdrive_seen_job
    GS-->>P: { ok:false, job:null, seen_job_id }
    Note over P: state = not-connected

    U->>P: Click "Connect Google Drive"
    P->>GS: connect
    GS->>DB: set_redirect_state(state, {uid,sid,host,intent})
    GS-->>P: { auth_url }  (scope=email+profile+drive.readonly)
    P->>GD: window.open(auth_url) prompt=select_account consent
    U->>GD: Đồng ý cấp quyền
    GD->>BT: redirect ?code&state
    BT->>DB: get_redirect_state(state) → parse row.metadata
    BT->>DB: DELETE state (single-use)
    BT->>GD: oauth2.getToken(code) + verifyIdToken(id_token)
    GD-->>BT: access + refresh + scope + sub + email
    BT->>DB: UPSERT oauth_accounts (INSERT … ON DUPLICATE KEY UPDATE)
    BT-->>P: BroadcastChannel + localStorage + postMessage (COOP-safe)
    P->>GS: get_state (re-resolve)
    GS-->>P: { ok:true, job:null }
    Note over P: state = ready

    U->>P: source folder + toggle Shared Drives → Start
    P->>GS: start_migration {hub_id,nid,source_folder_id}
    GS->>Q: getUserJob — đã có job active? → already_running
    GS->>DB: scope + refresh_token + mfs_access_node WRITE
    GS->>Q: addMigration()
    GS->>DB: profile.tools_migration_skipped=1
    GS-->>P: { job_id }
    Note over P: state = in-progress

    Q->>WK: process(migrate_google_drive)
    WK->>DB: _getFreshToken (lazy refresh)
    WK->>DB: get_db_name(hub_id) [fallback user_id] → db_name
    WK->>MFS: mfs_node_attr(nid) → destFolder + hubHomeDir
    loop mỗi folder / file
        WK->>GD: files.list (paginate, token refresh mỗi page)
        WK->>GD: download (.part → rename, async)
        WK->>MFS: mfs_create_node(owner_id=user_id) + async copyFile
        WK->>MFS: _findChildId resolve node id (SELECT trực tiếp)
        WK->>Q: job.progress({processed,total})
    end
    WK->>Q: returnvalue {done} + async rm scratch

    loop poll mỗi 2s (in-progress)
        P->>GS: get_status {job_id}
        GS-->>P: {status, processed, total, %}
    end
    Note over P: state = done → "Imported N files in M folders"
    U->>P: Close (→ ack_result) / Migrate again (→ ready, chạy incremental)
```

---

## 2. Popup state machine (Frontend)

> Nguồn sự thật của trạng thái là **Bull queue** (server). Popup mở lên gọi **`get_state`** để reconnect job đang chạy / hiện kết quả vừa xong — KHÔNG mặc định về "Start".

```mermaid
stateDiagram-v2
    [*] --> checking: onDomRefresh / re-resolve

    checking --> ready: get_state ok, không có job
    checking --> not_connected: get_state !ok
    checking --> in_progress: get_state job running → reconnect
    checking --> result: get_state job finished & chưa xem

    not_connected --> connecting: click Connect
    connecting --> checking: BroadcastChannel/storage/postMessage ok → re-resolve
    connecting --> not_connected: !ok (show error)

    ready --> in_progress: click Start → {job_id}<br/>(already_running → reconnect)

    in_progress --> in_progress: poll 2s (queued/running)
    in_progress --> result: status done/failed/cancelled

    result --> ready: Migrate again / Try again → ack + ready
    result --> [*]: Close → ack_result

    note right of in_progress
        Cross-tab: tab khác bấm Start →
        BroadcastChannel(gdrive-migration-started)
        → tab này tự nhảy vào in_progress
    end note
    note right of result
        ack_result lưu profile.gdrive_seen_job
        → kết quả chỉ hiện 1 lần
    end note
```

---

## 3. OAuth elevation sub-flow

> Drive migration dùng **OAuth client riêng** (`/etc/drumee/credential/google/drive.json`), tách khỏi client sign-in. Scope xin `email profile drive.readonly` — `email/profile` để callback lấy `sub` (provider_user_id) cho upsert; `drive.readonly` để đọc Drive.

```mermaid
flowchart TD
    A[Popup: click Connect] --> B[connect endpoint]
    B --> C[set_redirect_state<br/>state = uniqueId<br/>metadata = uid,sid,host,intent]
    C --> D[generateAuthUrl<br/>scope=email profile drive.readonly<br/>prompt=select_account consent<br/>access_type=offline]
    D --> E[window.open OAuth popup]
    E --> F{User consent?}
    F -->|Đồng ý| G[Google redirect<br/>https://domain + svc_location<br/>/butler.google_drive_callback]
    F -->|Từ chối| X[signal ok=false]

    G --> H[get_redirect_state → parse row.metadata]
    H --> I[DELETE state — single-use chống replay]
    I --> J{intent == gdrive_migrate<br/>& uid hợp lệ?}
    J -->|Không| X
    J -->|Có| K[oauth2.getToken code]
    K --> L[verifyIdToken id_token<br/>→ sub + email]
    L --> M{có sub?}
    M -->|Không| X[no_identity]
    M -->|Có| N[UPSERT oauth_accounts<br/>INSERT … ON DUPLICATE KEY UPDATE<br/>key = provider, provider_user_id]
    N --> O[closing page signals opener:<br/>BroadcastChannel gdrive-oauth +<br/>localStorage gdrive-oauth-result +<br/>postMessage — COOP-safe]
    X --> O
    O --> P[Popup nhận qua 1 trong 3 kênh<br/>→ get_state re-resolve]

    style I fill:#fce8e6
    style N fill:#e6f4ea
    style O fill:#fce8e6
```

**Vì sao 3 kênh tín hiệu:** màn consent của Google ship `Cross-Origin-Opener-Policy` → cắt `window.opener` của popup → `postMessage` về opener im lặng. BroadcastChannel + localStorage `storage` event (same-origin, sống sót opener bị cắt) đảm bảo app vẫn nhận. `redirect_uri` build từ `svc_location` (endpoint-aware) và **byte-identical** giữa `connect` (generateAuthUrl) và callback (getToken) — phải khớp giá trị đăng ký trong Google Console.

---

## 4. Worker / Importer internal flow

> Bull là nguồn sự thật. `mfs_create_node` qua connection của worker là CALL-with-OUT → **kết quả trả về không tin được** (mảng `[resultSet, okPacket]`); luôn resolve id qua **SELECT trực tiếp `media`** (`_findChildId`) rồi `mfs_node_attr`. Mọi fs I/O **async** (threadpool) để không chặn event loop → tránh Bull stall.

```mermaid
flowchart TD
    A[Bull job: migrate_google_drive] --> B[run]
    B --> C[validate user_id/hub_id/nid]
    C --> D[await mkdir /tmp/gdrive-job-id<br/>per-job scratch]
    D --> E[_getFreshToken]
    E --> F{NEEDS_RECONNECT?}
    F -->|Có| G[job.discard → không retry] --> Z1[throw]
    F -->|Không| H[get_db_name hub_id<br/>fallback user_id → db_name]
    H --> I[new Mariadb db_name]
    I --> J[mfs_node_attr nid → destFolder<br/>+ hubHomeDir strip /__storage__]
    J --> K[_createFolder 'GoogleDriveMigration'<br/>owner_id=user_id]
    K --> L[_traverse]

    L --> M{_checkCancelled?}
    M -->|Có| Z2[return sạch]
    M -->|Không| N[_listFolder paginate<br/>token refresh mỗi page]
    N --> O{for each item}

    O --> P{_checkCancelled? TRƯỚC mỗi file}
    P -->|Có| Z2
    P -->|Không| Q{item là folder?}

    Q -->|Folder| R[_createFolder name, owner_id<br/>mfs_create_node category=folder<br/>mimetype=folder, ext=''<br/>→ _findChildId → mfs_node_attr]
    R --> S{_cancelled?}
    S -->|Có| Z2
    S -->|Không| O

    Q -->|File| T{Workspace doc?}
    T -->|Có| U[export Docs→pdf, Sheets→xlsx,<br/>Slides→pptx, Drawing→png]
    T -->|Không| V[alt=media downloadUrl]
    U --> W
    V --> W{file_path có?<br/>_findChildId tồn tại & skip}
    W -->|Có & skip| O
    W -->|Không| X1[download → .part → await rename]
    X1 --> X2[mfs_create_node owner_id=user_id<br/>→ _findChildId → nodeId]
    X2 --> X3[await mkdir + await copyFile<br/>→ home_dir/__storage__/nodeId/orig.ext]
    X3 --> X4[job.progress mỗi 5 file]
    X4 --> O

    O -->|hết item| Y[finally: hubDb.end<br/>+ await rm scratch]
    Z2 --> Y
    Y --> Z3[returnvalue processed/total/errors/cancelled]

    style D fill:#e6f4ea
    style H fill:#e6f4ea
    style K fill:#fce8e6
    style R fill:#fce8e6
    style X2 fill:#fce8e6
    style X3 fill:#e6f4ea
    style Y fill:#e6f4ea
```

**Các ràng buộc đã học (đừng tái phạm):**
- `get_db_name(id)` resolve db_name (drumate **hoặc** hub). Proc `entity_exists` KHÔNG tồn tại.
- `mfs_create_node` cho folder/file cần `owner_id` **hợp lệ** (= user_id) — NULL → proc rollback ngầm. Folder cần `mimetype:'folder'` (cột `media.mimetype` NOT NULL).
- Resolve id qua `_findChildId` (SELECT `media` WHERE parent_id+user_filename), KHÔNG đọc `.id` từ return của `mfs_create_node`.
- fs I/O async (`fsp.copyFile/mkdir/rename/stat/rm`) — `cpSync`/`rmSync` đồng bộ chặn loop → Bull "stalled".

---

## 5. Cancellation flow

```mermaid
flowchart TD
    A[User click Cancel] --> B[google_drive.cancel job_id]
    B --> C{ownership: job.user_id == uid?}
    C -->|Không| X[throw forbidden]
    C -->|Có| D[migrationQueue.cancelJob]
    D --> E{job state?}

    E -->|completed/failed| F[ok terminal — no-op]
    E -->|waiting/delayed| G[job.remove → ok removed]
    E -->|active| H[SET Redis gdrive:cancel:id EX 3600s]

    H --> I[worker đọc sentinel giữa mỗi file]
    I --> J[_traverse return sạch, _cancelled=true]
    J --> K[returnvalue cancelled:true + processed đã làm]

    style I fill:#fce8e6
    style H fill:#fef7e0
```

---

## 6. Token lifecycle

```mermaid
flowchart TD
    A[Drive request cần token] --> B[_getFreshToken]
    B --> C{cache còn hạn? expires_at - 60 > now}
    C -->|Còn| D[dùng cache]
    C -->|Hết| E[SELECT oauth_accounts row]
    E --> F{row còn hạn?}
    F -->|Còn| G[cache + dùng]
    F -->|Hết| H{có refresh_token?}
    H -->|Không| I[throw NEEDS_RECONNECT → job.discard]
    H -->|Có| J[oauth2.refreshAccessToken]
    J --> K{thành công?}
    K -->|Không| I
    K -->|Có| L[UPDATE access_token+expires_at + cache]
    L --> D
    G --> D

    style B fill:#fce8e6
    style I fill:#fce8e6
```

---

## 7. Reconnect, re-migrate & Settings integration

> Trạng thái migration thuộc Bull (persistent), không phải instance popup. Đóng popup / rời Settings / reload / tab khác đều reconnect được.

- **`get_state`** (gọi lúc popup mở **và** lúc Settings load): `{ ok: <có drive scope>, job: <getUserJob shaped|null>, seen_job_id: profile.gdrive_seen_job }`.
- **`getUserJob(uid)`**: quét job Bull (bounded) lọc theo `job.data.user_id`, ưu tiên đang chạy, else finished mới nhất.
- **Reconnect**: job running → popup vào thẳng `in-progress` + poll (không hiện "Start").
- **Show-once**: job finished & `job_id != seen_job_id` → hiện kết quả 1 lần; `ack_result` (đóng từ màn result) set `profile.gdrive_seen_job`.
- **Dedup**: `start_migration` nếu đã có job active → trả `{job_id, already_running:1}` (không tạo trùng).
- **Re-migrate** (incremental, chỉ file mới — skip file đã có): màn result có **"Migrate again"** (done/cancelled) / **"Try again"** (failed) → `_restart` → ready → Start.
- **Cross-tab**: tab Start → BroadcastChannel `gdrive-migration-started` → tab khác đang ở ready tự vào in-progress.
- **Settings row** ("Migrate from Google Drive"): load Settings → `get_state` → row hiện "Migration in progress — X/Y (NN%)" + nút **"View progress"** khi đang chạy; "Migrate again" nếu đã từng migrate; "Start migration" nếu chưa. Nút dùng **style ghost chung** (giống pill "Coming soon").

---

## 8. Phân chia trách nhiệm (component map)

| Layer | File | Trách nhiệm |
|---|---|---|
| Onboarding | `onboarding-ui/app/skeleton/toolkit/form.js` | Chip "Google Drive" → `profile.tools` |
| Auto-launch | `ui-team/.../modules/desk/index.js` | Mở popup khi user dùng GDrive & chưa skip |
| Popup UI | `ui-team/.../widget/migrate-gdrive-popup/` | State machine + get_state reconnect + form + progress + re-migrate |
| Settings | `ui-team/.../widget/settings/main/` | Re-entry + row hiện trạng thái migration (get_state on load) |
| Endpoint | `server-team/service/private/google_drive.js` | has_drive_scope, connect, start_migration (dedup), get_status, **get_state**, **ack_result**, cancel, dismiss |
| OAuth callback | `server-team/service/butler.js` | google_drive_callback — getToken + verifyIdToken + UPSERT + closing page (3 kênh) |
| Queue | `server-team/offline/queues/migrationQueue.js` | Bull add/status/cancel/stats + **getUserJob** + sentinel + lock settings |
| Worker | `server-team/offline/workers/gdriveWorker.js` | Drain queue (concurrency 2), pm2-managed (**restart riêng** sau khi sửa importer) |
| Importer | `server-team/offline/workers/gdrive/importer.js` | Traverse → download → MFS node (async I/O, _findChildId, owner_id+mimetype) |
| Base lib | `server-team/service/lib/ext_import.js` | Token refresh + import helpers |
| ACL | `acl/google_drive.json`, `acl/butler.json` | Routes + permissions (scope=hub, owner) |

---

## 9. Trạng thái & giới hạn

**Đã có:**
- Full pipeline onboarding → OAuth elevation → queue → worker → MFS (đã chạy thật: 446 file / 7 folder OK).
- Folder recursion + pagination (1000/page) + Shared Drives + Workspace export.
- Progress / cancel / retry (3 attempts, exp backoff).
- **Reconnect** job đang chạy (đóng/reload/tab khác) + show-once kết quả + **re-migrate incremental**.
- Settings row phản ánh trạng thái migration lúc load.
- **Chọn folder/file cụ thể** (Selected mode) qua cây lazy-load — xem section 11.
- Async fs I/O + Bull lock tolerance (lockDuration 60s, maxStalledCount 3) → chống "job stalled".

**Chưa có (Phase 2):**
- Conflict policy `overwrite` / `rename` (chỉ `skip` → file **đã sửa** trên Drive KHÔNG được cập nhật, chỉ thêm file mới).
- Resume per-file sau crash (retry/re-run chạy lại từ đầu, dựa skip để bỏ qua file đã có).
- Real-time push (FE poll 2s; Settings row là snapshot lúc load).
- Live reconnect cross-device (chỉ cross-tab cùng browser qua BroadcastChannel; cross-device cần mở lại popup → get_state).
- **Home menu KHÔNG cập nhật live khi migrate xong.** Worker (offline) tạo node trực tiếp qua `mfs_create_node`, KHÔNG phát WS `media.new` → desk `workspace-list`/`workspace-item` (vốn refresh theo `media.new`) không thấy folder/file mới ngay. Node được tạo **đúng dưới home root** nên hiện khi home **re-fetch** (navigate/reload). Trường hợp home rỗng cũng vậy: sau migrate cần reload mới thấy "GoogleDriveMigration". → Phase 2: worker đẩy `media.new` qua Redis pub/sub → endpoint → user socket (hoặc FE tự refresh desk khi popup `done`).

## 10. Deploy

- **server-team**: thay đổi `service/*` (endpoint) → restart endpoint/service. Thay đổi **`offline/workers/gdrive/importer.js` hoặc `migrationQueue.js` lock settings → `sudo drumee restart gdrive-worker`** (process worker riêng, deploy KHÔNG tự restart). Google Console (client Drive) phải đăng ký đúng `redirect_uri` từ `svc_location` mỗi endpoint.
- **ui-team**: `npm run dev` (build+deploy) + **`pm2 restart vudangnt`** (endpoint cache bundle manifest lúc startup) + hard-reload trình duyệt.

## 11. Chọn folder/file cụ thể (Selected mode)

Màn hình `ready` có 2 chế độ (radio):
- **Migrate everything** (mặc định) — như cũ: duyệt từ `root` toàn My Drive, tôn trọng toggle *Include Shared Drives*.
- **Choose folders & files** — hiện cây thư mục lazy-load (My Drive only). Tick folder = cả subtree; tick file = file đó. **Không tri-state**: mở 1 folder đã tick thì các con hiện mờ ("included via parent") — muốn chọn lẻ con thì bỏ tick folder cha trước.

**Endpoint `google_drive.list`** (read-only, My Drive only):
- in: `{ folder_id='root', page_token? }` → out: `{ files: [{ id, name, is_folder, mime_type, size }], next_page_token }`.
- Token qua `ExtImport.ensureFreshToken('google')`; lỗi → `NEEDS_RECONNECT`. Phân trang `pageSize=200`, `orderBy=folder,name` (folder trước, rồi tên).

**`start_migration`** nhận thêm:
- `mode` ('all' | 'selected', default 'all').
- `selections` = `{ folder_ids:[], file_ids:[] }` (chỉ Selected; rỗng → `NOTHING_SELECTED`). All-mode bỏ qua `selections`; Selected-mode bỏ qua `source_folder_id`/`include_shared_drives`.
- Truyền tiếp vào job data qua `addMigration` (queue whitelist field → đã thêm `mode`/`selections`).

**Importer** (`run()`):
- `mode` thiếu/'all' → `_traverse` từ `source_folder_id` (tương thích ngược với job cũ).
- 'selected' → `_migrateSelected`: mỗi `folder_id` → `_getMeta` lấy tên → tạo subfolder cùng tên dưới `GoogleDriveMigration` rồi `_traverse` (cả subtree); mỗi `file_id` → `_getMeta` → `_importItem` thẳng vào root. `_getMeta` = Drive `files.get?fields=id,name,mimeType,size` (server tự lấy metadata, KHÔNG tin tên client gửi).

**FE state** (popup instance): `_migrateMode`, `_treeCache` (folderId→`{items,next_page_token}`), `_expanded`/`_checkedFolders`/`_checkedFiles`/`_loading` (Set). Tree re-render scoped qua `ensurePart('gdrive-tree').feed(require('./skeleton/tree')(this))`; Start disable khi Selected + chưa chọn gì (`_refreshStartState` set `data-disabled`, `_startMigration` cũng guard + alert `NOTHING_SELECTED`).

**Giới hạn (Phase sau):** Shared Drives KHÔNG hiện trong cây (chỉ áp dụng All mode). Không chọn lẻ file bên trong folder đã tick (phải bỏ tick cha). Tri-state include/exclude.
