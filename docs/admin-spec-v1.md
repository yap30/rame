# RAMEINAJA — Admin UX Flow, Schema & MVP Specification v1.0

Berdasarkan analisis codebase Rameinaja (Next.js 15 + Prisma + PostgreSQL + e.id Verifier/OAuth),
dokumen ini menjadi dasar implementasi sistem Admin (platform governance & operations).

---

## A. Admin Information Architecture (Sitemap)

```
Dashboard                  — ringkasan platform + pending actions
├── Platform Overview      (users, organizers, events, participants)
├── Event Activity         (registrations, check-ins, journey)
├── Credential Activity    (issued / verified / failed / revoked)
└── Attention Required     (pending review, reports, failed integration, suspicious)

Users                      — list/search/filter/detail, suspend/unsuspend, ubah role
Organizers                 — list/detail, review EO baru, approve/reject, suspend
Events                     — list/filter, review (approve/reject/revisi), detail, suspend
├── Event Detail           — overview, participants, journey, check-in, QR, gamification, credentials
Participants               — list/detail (partisipasi, progres, aktivitas)
Event Journey              — lihat konfigurasi journey, monitor completion/anomali
QR & Check-in              — QR list/detail/scan history/revoke; attendance overview
Gamification               — stamp/XP/achievement monitoring per event
Credentials                — list/detail, issuance & verification status, revoke
e.id                       — integration status, logs, failed request
Reports                    — list/detail, investigation, resolve/dismiss
Analytics                  — (P1) aggregasi per event
Notifications              — (P1)
Support                    — (P1)
Audit Logs                 — list/filter/detail
Settings                   — (P1) konfigurasi platform
```

Submenu hanya dibuat untuk kebutuhan nyata (sesuai MVP P0, lihat bagian J).

---

## B. Admin Use Case Matrix (P0)

| Actor | Use Case | Resource | Action | Result |
|-------|----------|----------|--------|--------|
| Admin | Lihat overview platform | Dashboard | GET /api/admin/overview | Statistik nyata |
| Admin | Review event baru | Event | POST /events/:id/publish {decision} | PUBLISHED / REJECTED + audit |
| Admin | Ubah role user | User | PATCH /api/admin/users/:id {role} | Role berubah |
| Admin | Lihat daftar event | Event | GET /api/admin/events | Semua status |
| Admin | Lihat daftar user | User | GET /api/admin/users | Daftar + orgs |
| Admin | Suspend/unsuspend user | User | PATCH /api/admin/users/:id/status (P1) | SUSPENDED/ACTIVE + audit |
| Admin | Review EO baru | Organizer | (P1) status PENDING→ACTIVE | Approval EO |
| Admin | Lihat peserta | Participant | GET /api/admin/participants (P1) | Detail partisipasi |
| Admin | Lihat audit trail | AuditLog | GET /api/admin/audit-logs (P1) | Riwayat aksi |
| Admin | Kelola laporan | Report | (P1) | OPEN→RESOLVED/DISMISSED |

---

## C. Admin UX Flow — P0

### C1. Event Approval (SUDAH IMPLEMENTASI)
```
EO
→ Dashboard Organizer → kartu event (DRAFT)
→ klik "🚀 Ajukan Review"
→ POST /api/organizer/events/{id}/submit
→ status: DRAFT → SUBMITTED
→ EventLog: EVENT_SUBMITTED
┌─────────────────────────────┐
↓ Admin                       │
→ Dashboard Admin → "Review Event"
→ lihat detail event (link)
→ klik "✓ Setujui" / "✕ Tolak"
→ POST /api/organizer/events/{id}/publish {decision}
→ status: SUBMITTED → PUBLISHED | REJECTED
→ EventLog: EVENT_APPROVED / EVENT_REJECTED
→ EO melihat badge status baru
```

### C2. Suspend User (P1 — flow desain)
```
Admin → Users → User Detail → Suspend → konfirmasi + alasan → PATCH status
→ SUSPENDED → sesi user ditolak (guard login) → Audit Log
```

### C3. Suspend Event (P1)
```
Admin → Events → Event Detail → Suspend → alasan → konfirmasi → status SUSPENDED
→ tidak muncul di daftar publik, join ditolak → Audit Log
```

### C4. Credential Revoke (P1)
```
Admin → Credentials → Detail → Revoke → alasan → konfirmasi
→ panggil issuer API e.id revoke (bila tersedia) + status lokal REVOKED → Audit Log
```

---

## D. Admin Screen Map — P0

| Screen | Purpose | Data | Actions | Permission |
|--------|---------|------|---------|------------|
| Dashboard | Ringkasan + pending | overview API | lihat | admin |
| Review Event | Approve/reject event | admin/events (SUBMITTED) | setujui/tolak | admin |
| User List | Daftar user + role | admin/users | ubah role | admin |
| Event List | Semua event + status | admin/events | buka detail | admin |
| (P1) User Detail | Detail + suspend | admin/users/:id | suspend | admin |
| (P1) Participant List | Partisipasi | admin/participants | lihat | admin |
| (P1) Audit Logs | Riwayat | admin/audit-logs | filter | admin |

---

## E. Database Schema — Mapping Existing vs Gap

### Sudah tersedia (TIDAK dibuat ulang)
```
User(id, name, email, role: ADMIN|ORGANIZER|PARTICIPANT, avatarUrl, createdAt)
ExternalIdentity(id, userId, provider, providerSubject, providerEmail, profileJson)   // e.id linkage
Organization(id, name, slug, description)
OrganizationMember(id, organizationId, userId, role: EO|ADMIN)
Event(id, slug, name, status: DRAFT|SUBMITTED|PUBLISHED|REJECTED, identityJson,
      journeyMode, pricingModel, price, quota, startsAt, endsAt, venueId, orgId)
EventParticipant(id, eventId, userId, status: JOINED|WAITLIST|REJECTED|COMPLETED)
Journey(id, eventId, mode) · JourneyNode(id, journeyId, activityId, position)
Activity(id, eventId, title, type, completionMethod, verificationRequired, xpReward, stampId)
ActivityCompletion(id, activityId, eventId, userId, method, idempotencyKey)
Stamp(id, eventId, name, emoji, color) · ParticipantStamp(id, userId, stampId, eventId, completionId)
XpTransaction(id, userId, eventId, amount, reason)
Achievement(id, eventId, name, emoji, condition) · ParticipantAchievement
CredentialConfig(id, eventId, schemaId, title, eligibilityPolicy) · CredentialIssuance(id, ...)
FeedbackForm / FeedbackQuestion / FeedbackResponse / FeedbackAnswer
QrSession(id, eventId, activityId, sid, status, nonce, expiresAt)
ScannerDevice(id, eventId, deviceCode, name, status) · VerificationRecord(id, ...)
EventLog(id, eventId, userId, actorType, action, dataJson, createdAt)   // audit trail parsial
AuthLoginSession(id, sessionId, status, holderDid, rawJson, userId)
```

### Gap (perlu ditambahkan saat implementasi P1 — JANGAN dibuat sekarang)
| Model | Fields minimal | Catatan |
|-------|---------------|---------|
| `AuditLog` | id, actorId, action, resourceType, resourceId, reason, before, after, createdAt | Ganti/pelengkap EventLog untuk aksi admin sensitif |
| `Report` | id, reporterId, targetType, targetId, category, description, status, assignedTo, resolution, timestamps | Laporan participant/admin |
| `RiskSignal` | id, eventId, userId, type, severity, description, status, metadata, timestamps | Anomali (bukan fraud otomatis) |
| `User.status` | ACTIVE/SUSPENDED/DISABLED | Kolom tambahan di User |

Tidak ada model baru untuk `admins` (pakai User.role=ADMIN) dan tidak ada `permissions` table
(role-based cukup untuk MVP — tambah RBAC granular hanya bila kebutuhan nyata muncul).

---

## F. ERD (menggunakan relasi existing)

```
User ─┬─< ExternalIdentity (e.id linkage: providerSubject = DID)
      ├─< OrganizationMember >─ Organization
      ├─< EventParticipant >─ Event ─< Journey ─< JourneyNode >─ Activity
      ├─< ActivityCompletion >─ Activity
      ├─< ParticipantStamp >─ Stamp
      ├─< XpTransaction >─ Event
      ├─< CredentialIssuance >─ CredentialConfig >─ Event
      └─< EventLog >─ Event
Admin (User.role=ADMIN) → EventLog (audit), Event review (status transition)
```

---

## G. API Schema — Existing vs New

### Sudah tersedia
```
GET  /api/admin/overview                      — statistik platform + eid status
GET  /api/admin/users                         — daftar user + role + orgs
PATCH /api/admin/users/:id                    — ubah role
GET  /api/admin/events                        — daftar event semua status
POST /api/organizer/events/:id/submit         — EO: DRAFT → SUBMITTED
POST /api/organizer/events/:id/publish        — ADMIN: approve/reject (decision)
```

### Perlu ditambahkan (P1, saat implementasi — jangan dibuat API palsu)
```
GET  /api/admin/users/:id                     — detail user
PATCH /api/admin/users/:id/status             — suspend/unsuspend (alasan)
GET  /api/admin/participants                  — daftar partisipasi
GET  /api/admin/participants/:id              — detail peserta
GET  /api/admin/audit-logs                    — audit trail
GET  /api/admin/reports · PATCH /api/admin/reports/:id
GET  /api/admin/risk-signals · PATCH /api/admin/risk-signals/:id
GET  /api/admin/credentials · POST /api/admin/credentials/:id/revoke
GET  /api/admin/eid/logs                      — log integration e.id (dari EventLog/AuthLoginSession)
```

---

## H. Permission Schema

Role tunggal `ADMIN` (tanpa role tambahan). Semua route admin guard:
`readSession().role === "ADMIN"` (sudah diterapkan di seluruh /api/admin/*).
Sensitivitas aksi (review/suspend/revoke) → wajib AuditLog.
Grant model `RESOURCE.ACTION` ditunda sampai kebutuhan multi-admin nyata (P2).

---

## I. State Machine

```
Event:  DRAFT → SUBMITTED → PUBLISHED   (EO submit, admin approve)
              └──────────→ REJECTED     (admin reject; EO dapat edit → DRAFT lagi)
        (P1) PUBLISHED ⇄ SUSPENDED · PUBLISHED → ONGOING → COMPLETED → ARCHIVED

User:   ACTIVE ⇄ SUSPENDED (P1) · DISABLED (P1)

Report: OPEN → INVESTIGATING → ACTION_REQUIRED → RESOLVED | DISMISSED (P1)

Credential issuance: PENDING → ISSUED → VERIFIED | REVOKED (mengikuti state provider e.id;
                      jangan mengarang state yang tidak didukung API)
```

---

## J. MVP Scope

### P0 — WAJIB (sebagian SUDAH IMPLEMENTASI)
- ✅ Dashboard overview + status e.id
- ✅ Users list + ubah role
- ✅ Event review (approve/reject) + status badge EO
- ✅ Event list (admin)
- ⬜ User detail + suspend/unsuspend
- ⬜ Organizer review (status EO)
- ⬜ Participant list/detail
- ⬜ Audit Logs (model + UI)
- ⬜ Credential list + issuance status (read dari DB)
- ⬜ e.id integration status + failed log

### P1 (setelah P0 stabil)
- Reports + resolution, Risk Signals, QR management, check-in monitoring,
  gamification analytics, notification, analytics lanjutan

### P2 (JANGAN diimplementasikan)
- Fraud engine otomatis, risk scoring lanjutan, finance/settlement,
  partner/sponsor management, BI lanjutan, moderasi otomatis

---

## K. Implementation Dependency

```
UI (admin pages)
 ↓
API (/api/admin/* — guard role ADMIN)
 ↓
Service/query layer (Prisma)
 ↓
Database (existing + AuditLog/Report/RiskSignal saat P1)
 ↓
External integration (e.id issuer revoke — HANYA bila API provider mendukung)
```

---

## L. Gap Analysis

| Area | Status codebase | Gap |
|------|----------------|-----|
| Role ADMIN | ✅ ada + guard | — |
| Event review | ✅ P0 selesai | — |
| Audit trail | ⚠️ EventLog parsial | Model AuditLog resmi (before/after/reason) |
| User suspend | ❌ | Kolom User.status + guard login |
| Organizer review | ❌ | Status EO (PENDING→ACTIVE) |
| Reports/Risk | ❌ | Model baru |
| Credential revoke | ⚠️ issuance lokal | Depend API issuer e.id (belum onboarding) |
| e.id logs | ⚠️ AuthLoginSession/EventLog | Aggregator UI |

---

## M. Blocking Questions

1. **Suspend user**: perlu kolom `User.status` — apakah suspend = blokir login seluruhnya
   (guard readSession) atau blokir aksi saja?
2. **Organizer review**: apakah EO baru perlu status PENDING sebelum bisa membuat event,
   atau cukup review event-nya (model saat ini: siapa pun bisa jadi EO via ensure)?
3. **Credential revoke**: issuer e.id belum di-onboard (client_id/secret issuer belum ada).
   Implementasi revoke nyata menunggu onboarding — setuju dipasang tombol revoke lokal
   (status DB) dulu, sinkron provider menyusul?
4. **Reports**: siapa yang bisa membuat laporan — participant saja, atau admin juga?
5. **AuditLog**: ganti EventLog atau duplikat khusus admin?
