# Google Drive Migration — Workflow

> Import toàn bộ file/folder từ Google Drive vào Drumee workspace.
> Tài liệu này dành cho team (PO, FE, BE, QA) — các sơ đồ Mermaid render trực tiếp trên GitHub/GitLab.

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
        S[Settings → Linked accounts] -->|launch thủ công| D
    end

    subgraph "Frontend (popup state machine)"
        D --> E[checking]
        E --> F[not-connected]
        E --> G[ready]
        F -->|OAuth| G
        G -->|Start| H[in-progress]
        H --> I[done / failed / cancelled]
    end

    subgraph "Backend"
        G -.->|connect| OA[OAuth elevation<br/>drive.readonly]
        H -.->|start_migration| Q[(Bull queue<br/>drumee:migration)]
        Q --> W[gdrive-worker<br/>importer]
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
    participant DB as oauth_accounts
    participant Q as Bull queue
    participant WK as gdrive-worker
    participant GD as Google Drive
    participant MFS as Drumee MFS

    Note over U,P: Onboarding đã set profile.tools=[google_drive]
    U->>P: Vào Desk → auto-launch popup
    P->>GS: has_drive_scope
    GS->>DB: SELECT scope, refresh_token
    GS-->>P: { ok:false }  (chưa có drive scope)

    Note over P: state = not-connected
    U->>P: Click "Connect Google Drive"
    P->>GS: connect
    GS->>DB: set_redirect_state(state, {uid,sid,intent})
    GS-->>P: { auth_url }
    P->>GD: window.open(auth_url)<br/>scope=drive.readonly, prompt=consent
    U->>GD: Đồng ý cấp quyền
    GD->>BT: redirect ?code&state
    BT->>DB: get_redirect_state(state)
    BT->>DB: DELETE state (single-use ✚)
    BT->>GD: oauth2.getToken(code)
    GD-->>BT: access + refresh + scope + expiry
    BT->>DB: UPDATE oauth_accounts
    BT-->>P: postMessage(gdrive-connected, origin ✚)
    P->>GS: has_drive_scope (re-check)
    GS-->>P: { ok:true }

    Note over P: state = ready
    U->>P: Nhập source folder + toggle Shared Drives → Start
    P->>GS: start_migration {hub_id,nid,source_folder_id}
    GS->>DB: check scope + refresh_token
    GS->>MFS: mfs_access_node → WRITE bit? ✚
    GS->>Q: addMigration()
    GS->>DB: profile.tools_migration_skipped=1
    GS-->>P: { job_id }

    Note over P: state = in-progress
    Q->>WK: process(migrate_google_drive)
    WK->>DB: _getFreshToken ✚ (lazy refresh)
    loop mỗi folder / file
        WK->>GD: files.list (paginate)
        GD-->>WK: files[]
        WK->>GD: download file (.part → rename ✚)
        WK->>MFS: mfs_create_node + cpSync
        WK->>Q: job.progress({processed,total})
    end
    WK->>Q: returnvalue {done} + rmSync scratch ✚

    loop poll mỗi 2s
        P->>GS: get_status {job_id}
        GS->>Q: getJobStatus
        GS-->>P: {status, processed, total}
    end
    Note over P: state = done → "Imported N files in M folders"
    U->>P: Close

    Note over U,MFS: ✚ = điểm đã fix trong code review
```

---

## 2. Popup state machine (Frontend)

```mermaid
stateDiagram-v2
    [*] --> checking: onDomRefresh

    checking --> ready: has_drive_scope ok
    checking --> not_connected: !ok

    not_connected --> connecting: click Connect
    connecting --> checking: postMessage ok → re-check
    connecting --> not_connected: postMessage !ok (show error)

    ready --> in_progress: click Start → {job_id}

    in_progress --> in_progress: poll 2s (queued/running)
    in_progress --> done: status=done
    in_progress --> failed: status=failed
    in_progress --> cancelled: status=cancelled (user Cancel)

    done --> [*]: Close
    failed --> [*]: Close
    cancelled --> [*]: Close

    note right of not_connected
        Nếu auto-from-onboarding:
        hiện link "Skip for now"
        → dismiss_post_onboarding
    end note
```

---

## 3. OAuth elevation sub-flow

> Sign-in chỉ xin `email profile`. Đọc Drive cần scope `drive.readonly` riêng → đây là bước "nâng quyền".

```mermaid
flowchart TD
    A[Popup: click Connect] --> B[connect endpoint]
    B --> C[set_redirect_state<br/>state = uniqueId<br/>payload = uid,sid,host,intent]
    C --> D[generateAuthUrl<br/>scope=drive.readonly<br/>prompt=select_account consent<br/>access_type=offline]
    D --> E[window.open OAuth popup]
    E --> F{User consent?}
    F -->|Đồng ý| G[Google redirect<br/>butler.google_drive_callback]
    F -->|Từ chối| X[postMessage ok=false]

    G --> H[get_redirect_state]
    H --> I[DELETE state ✚<br/>single-use chống replay]
    I --> J{intent == gdrive_migrate<br/>& uid hợp lệ?}
    J -->|Không| X
    J -->|Có| K[oauth2.getToken code]
    K --> L{Có refresh_token?}
    L -->|Có| M[UPDATE access+refresh+scope+expiry]
    L -->|Không| N[UPDATE access+scope+expiry<br/>giữ refresh_token cũ]
    M --> O[closing page<br/>postMessage gdrive-connected<br/>target = origin ✚]
    N --> O
    X --> O
    O --> P[Popup nhận message<br/>check evt.origin ✚<br/>→ re-check scope]

    style I fill:#fce8e6
    style O fill:#fce8e6
    style P fill:#fce8e6
```

---

## 4. Worker / Importer internal flow

```mermaid
flowchart TD
    A[Bull job: migrate_google_drive] --> B[run]
    B --> C[validate user_id/hub_id/nid]
    C --> D[mkdir /tmp/gdrive-job-id ✚<br/>per-job scratch]
    D --> E[_getFreshToken ✚]
    E --> F{NEEDS_RECONNECT?}
    F -->|Có| G[job.discard ✚<br/>không retry] --> Z1[throw]
    F -->|Không| H[entity_exists hub_id → db_name]
    H --> I[new Mariadb hub.db_name]
    I --> J[mfs_node_attr nid → destFolder]
    J --> K[_traverse]

    K --> L{_checkCancelled?}
    L -->|Có| Z2[return sạch]
    L -->|Không| M[_listFolder paginate<br/>token refresh mỗi page ✚]
    M --> N[totalFiles += non-folder]
    N --> O{for each item}

    O --> P{_checkCancelled? ✚<br/>TRƯỚC mỗi file}
    P -->|Có| Z2
    P -->|Không| Q{item là folder?}

    Q -->|Folder| R[_createFolder<br/>→ _traverse con]
    R --> S{_cancelled? ✚}
    S -->|Có| Z2
    S -->|Không| O

    Q -->|File| T{webContentLink?}
    T -->|Không| U[Workspace export<br/>Docs→pdf, Sheets→xlsx...]
    T -->|Có| V[downloadUrl]
    U --> W
    V --> W[node_id_from_path exists?]
    W -->|Có & skip| O
    W -->|Không| X1[cacheKey = md5 id+exportMime ✚]
    X1 --> X2[download → .part → rename ✚<br/>unlink nếu lỗi]
    X2 --> X3[mfs_create_node + cpSync]
    X3 --> X4[job.progress mỗi 5 file]
    X4 --> O

    O -->|hết item| Y[finally:<br/>hubDb.end + rmSync scratch ✚]
    Z2 --> Y
    Y --> Z3[returnvalue<br/>processed/total/errors/cancelled]

    style D fill:#e6f4ea
    style E fill:#fce8e6
    style P fill:#fce8e6
    style X1 fill:#fce8e6
    style X2 fill:#fce8e6
    style Y fill:#e6f4ea
```

---

## 5. Cancellation flow

```mermaid
flowchart TD
    A[User click Cancel] --> B[google_drive.cancel job_id]
    B --> C{ownership:<br/>job.user_id == uid?}
    C -->|Không| X[throw forbidden]
    C -->|Có| D[migrationQueue.cancelJob]
    D --> E{job state?}

    E -->|completed/failed| F[ok terminal — no-op]
    E -->|waiting/delayed| G[job.remove → ok removed]
    E -->|active| H[SET Redis<br/>gdrive:cancel:id EX 3600s]

    H --> I[worker đọc sentinel<br/>giữa mỗi file ✚]
    I --> J[_traverse return sạch<br/>_cancelled = true]
    J --> K[returnvalue cancelled:true<br/>+ processed_files đã làm]

    style I fill:#fce8e6
    style H fill:#fef7e0
```

---

## 6. Token lifecycle

```mermaid
flowchart TD
    A[Drive request cần token] --> B[_getFreshToken ✚]
    B --> C{cache còn hạn?<br/>expires_at - 60 > now}
    C -->|Còn| D[dùng cache]
    C -->|Hết| E[SELECT oauth_accounts row]
    E --> F{row còn hạn?}
    F -->|Còn| G[cache + dùng]
    F -->|Hết| H{có refresh_token?}
    H -->|Không| I[throw NEEDS_RECONNECT<br/>→ job.discard]
    H -->|Có| J[oauth2.refreshAccessToken]
    J --> K{thành công?}
    K -->|Không| I
    K -->|Có| L[UPDATE access_token+expires_at<br/>+ cache]
    L --> D
    G --> D

    style B fill:#fce8e6
    style I fill:#fce8e6
```

---

## 7. Phân chia trách nhiệm (component map)

| Layer | File | Trách nhiệm |
|---|---|---|
| Onboarding | `onboarding-ui/app/skeleton/toolkit/form.js` | Chip "Google Drive" → `profile.tools` |
| Auto-launch | `ui-team/.../modules/desk/index.js` | Mở popup khi user dùng GDrive & chưa skip |
| Popup UI | `ui-team/.../widget/migrate-gdrive-popup/` | State machine + form + progress |
| Settings | `ui-team/.../widget/settings/main/index.js` | Re-entry thủ công |
| Endpoint | `server-team/service/private/google_drive.js` | has_drive_scope, connect, start_migration, get_status, cancel, dismiss |
| OAuth callback | `server-team/service/butler.js` | google_drive_callback — đổi code→token |
| Queue | `server-team/offline/queues/migrationQueue.js` | Bull add/status/cancel/stats + sentinel |
| Worker | `server-team/offline/workers/gdriveWorker.js` | Drain queue (concurrency 2), pm2-managed |
| Importer | `server-team/offline/workers/gdrive/importer.js` | Traverse → download → MFS node |
| Base lib | `server-team/service/lib/ext_import.js` | Token refresh + import helpers |
| ACL | `acl/google_drive.json`, `acl/butler.json` | Routes + permissions (scope=hub, owner) |

---

## 8. Trạng thái & giới hạn (Phase 1)

**Đã có:**
- Full pipeline onboarding → OAuth → queue → worker → MFS
- Folder recursion + pagination (1000/page) + Shared Drives
- Workspace export (Docs→pdf, Sheets→xlsx, Slides→pptx, Drawing→png)
- Progress / cancel / retry (3 attempts, exp backoff)

**Chưa có:**
- Conflict policy `overwrite` / `rename` (chỉ `skip`)
- Resume per-file sau crash (retry chạy lại từ đầu)
- Real-time push (FE poll 2s)

**Demo:** happy path OK. Tránh: overwrite policy, Drive >1h (cũ), expect cancel tức thì (cũ).

> `✚` = 12 điểm fix trong code review (security/integrity/reliability/UX/resource).
