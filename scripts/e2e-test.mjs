// ============================================================
// RAME — smoke test end-to-end (jalankan: node scripts/e2e-test.mjs)
// Alur: login participant -> join -> kuis -> QR -> scan organizer
//       -> feedback -> credential -> analytics
// ============================================================
const BASE = process.env.BASE ?? "http://localhost:3000";

let cookie = "";
const jar = { set: (res) => { const sc = res.headers.getSetCookie?.() ?? []; for (const c of sc) cookie = c.split(";")[0]; } };

async function req(path, { method = "GET", body, asJson = true } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });
  jar.set(res);
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { status: res.status, data };
}

let pass = 0, fail = 0;
function check(name, cond, extra = "") {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name} ${extra}`); }
}

console.log("▶ 1. Login participant (mock e.id)");
let r = await req("/api/auth/mock-login", { method: "POST", body: { kind: "participant" } });
check("login 200", r.status === 200, `(${r.status})`);
check("user Putri", r.data?.user?.name === "Putri Anggraini");

console.log("▶ 2. Ambil data event");
r = await req("/api/events/jelajah-kota-tua");
check("event detail 200", r.status === 200);
const ev = r.data.event;
const quizNode = r.data.journey.nodes.find((n) => n.title.includes("Sandi"));
const qrNode = r.data.journey.nodes.find((n) => n.title.includes("Menara Jam"));
check("5 node journey", r.data.journey.nodes.length === 5, `(${r.data.journey.nodes.length})`);
check("5 stamps", r.data.stamps.length === 5);

console.log("▶ 3. Join event");
r = await req(`/api/events/${ev.id}/join`, { method: "POST" });
check("join ok", r.data?.joined === true);
r = await req(`/api/events/${ev.id}/join`, { method: "POST" });
check("join idempoten", r.data?.message === "ALREADY_JOINED");

console.log("▶ 3b. Kuis Sandi Pusaka (Putri sudah selesai dari seed → idempoten)");
r = await req(`/api/activities/${quizNode.activityId}/complete`, { method: "POST", body: { method: "AUTO", data: { answers: [1, 1, 0] } } });
check("kuis ulang -> ALREADY_COMPLETED", r.data?.message === "ALREADY_COMPLETED", `(${r.data?.message})`);

console.log("▶ 4. Aktivitas baru: Tulis Harapan (jalur reward penuh)");
const ev2 = await req(`/api/events/${ev.id}`);
const hope = ev2.data.journey.nodes.find((n) => n.title.includes("Tulis Harapan"));
check("node Tulis Harapan ada", Boolean(hope));
r = await req(`/api/activities/${hope.activityId}/complete`, { method: "POST", body: { method: "AUTO", data: { harapan: "Semoga Semilir makin hijau!" } } });
const newlyCompleted = r.data?.message === "COMPLETED";
check("completed (atau sudah dari run sebelumnya)", newlyCompleted || r.data?.message === "ALREADY_COMPLETED", `(${r.data?.message})`);
check("xp 50 (hanya jika baru selesai)", !newlyCompleted || r.data?.xp === 50, `(${r.data?.xp})`);
check("stamp Penulis Cerita (hanya jika baru selesai)", !newlyCompleted || r.data?.stamp?.name === "Penulis Cerita", `(${r.data?.stamp?.name})`);
r = await req(`/api/activities/${hope.activityId}/complete`, { method: "POST", body: { method: "AUTO", data: {} } });
check("duplikat -> ALREADY_COMPLETED", r.data?.message === "ALREADY_COMPLETED", `(${r.data?.message})`);

console.log("▶ 5. Buat QR & verifikasi (organizer scan)");
r = await req(`/api/activities/${qrNode.activityId}/qr`, { method: "POST" });
check("QR dibuat (409 = sudah selesai dari run sebelumnya)", r.status === 200 && r.data?.qr?.startsWith("data:image/png") || r.status === 409, `(${r.status})`);

// login organizer utk tes scan dgn payload yang valid
r = await req("/api/auth/mock-login", { method: "POST", body: { kind: "organizer" } });
const devices = await req(`/api/organizer/events/${ev.id}/scanner`);
const devCode = devices.data.devices[0]?.deviceCode;
check("device scanner terotorisasi", Boolean(devCode), JSON.stringify(devices.data.devices));
if (devCode) {
  // buat payload QR valid: kita simulasikan via endpoint internal — ambil session terbaru user participant
  // (untuk smoke test, scan dgn payload palsu harus ditolak)
  r = await req("/api/verification/scan", { method: "POST", body: { payload: JSON.stringify({ v: 1, sid: "fake", nonce: "fake", aid: qrNode.activityId, eid: ev.id, uid: "x", exp: Date.now() + 5000 }), deviceCode: devCode } });
  check("scan payload palsu ditolak", r.status === 400 || r.status === 410, `(${r.status})`);
}

console.log("▶ 6. Feedback");
r = await req("/api/auth/mock-login", { method: "POST", body: { kind: "participant" } });
const fb = await req(`/api/events/${ev.id}`);
const qs = fb.data.feedback.questions;
const answers = {};
for (const q of qs) answers[q.id] = q.type === "RATING" ? "5" : q.type === "CHOICE" ? "Sangat mungkin" : "Keroncongnya magis!";
r = await req(`/api/feedback/${fb.data.feedback.id}/submit`, { method: "POST", body: { answers } });
check("feedback terkirim (atau sudah dari run sebelumnya)", r.status === 200 || r.status === 409, `(${r.status})`);
r = await req(`/api/feedback/${fb.data.feedback.id}/submit`, { method: "POST", body: { answers } });
check("feedback duplikat ditolak", r.status === 409, `(${r.status})`);

console.log("▶ 7. Kredensial");
r = await req(`/api/events/${ev.id}/credential/claim`, { method: "POST" });
check("klaim saat belum layak -> ELIGIBLE (atau sudah ISSUED)", r.data?.status === "ELIGIBLE" || r.data?.status === "ISSUED", `(${r.data?.status} · ${r.data?.message})`);
// selesaikan 3 aktivitas tersisa utk memenuhi EVENT_COMPLETION
const remaining = ev2.data.journey.nodes.filter((n) => !["Sandi Pusaka", "Tulis Harapan"].some((x) => n.title.includes(x)));
for (const n of remaining) {
  r = await req(`/api/activities/${n.activityId}/complete`, { method: "POST", body: { method: "AUTO", data: { via: "e2e" } } });
  if (r.data?.message !== "COMPLETED" && r.data?.message !== "ALREADY_COMPLETED") {
    console.log(`     ⚠ aktivitas ${n.title}: ${r.data?.message ?? r.status}`);
  }
}
r = await req(`/api/events/${ev.id}`);
check("progres 5/5", r.data?.progress?.completed === 5 && r.data?.progress?.total === 5, `(${r.data?.progress?.completed}/${r.data?.progress?.total})`);
r = await req(`/api/events/${ev.id}/credential/claim`, { method: "POST" });
check("klaim kredensial (mock -> ISSUED)", r.data?.status === "ISSUED", `(${r.data?.status} · ${r.data?.message})`);
check("ref mock ada", Boolean(r.data?.providerReference));

console.log("▶ 8. Analytics & insights & replay (organizer)");
r = await req("/api/auth/mock-login", { method: "POST", body: { kind: "organizer" } });
r = await req(`/api/organizer/events/${ev.id}/analytics`);
check("analytics 200", r.status === 200, `(${r.status})`);
check("total participants >= 5", r.data?.analytics?.totalParticipants >= 5, `(${r.data?.analytics?.totalParticipants})`);
check("completion rate ada", typeof r.data?.analytics?.completionRate === "number");
r = await req(`/api/organizer/events/${ev.id}/insights`);
check("insights 200", r.status === 200 && Array.isArray(r.data?.insights), `(${r.status})`);
r = await req(`/api/organizer/events/${ev.id}/replay`);
check("replay 200 + log", r.status === 200 && r.data?.replay?.total > 0, `(${r.data?.replay?.total})`);

console.log("▶ 9. Rekomendasi (participant)");
r = await req("/api/auth/mock-login", { method: "POST", body: { kind: "participant" } });
r = await req("/api/recommendations");
check("rekomendasi 200", r.status === 200 && Array.isArray(r.data?.recommendations), `(${r.status})`);
check("ada rekomendasi", (r.data?.recommendations?.length ?? 0) > 0, `(${r.data?.recommendations?.length})`);

console.log("▶ 10. RBAC: participant akses organizer -> 401/403");
r = await req(`/api/organizer/events/${ev.id}/analytics`);
check("ditolak", r.status === 401 || r.status === 403, `(${r.status})`);

console.log("▶ 11. Login with VC (Verifier e.id)");
r = await req("/api/auth/eid/vc/start", { method: "POST" });
check("vc start -> QR dibuat", r.status === 200 && r.data?.ok && r.data?.qr?.startsWith("data:image/png"), `(${r.status})`);
const vcSid = r.data?.sessionId;
check("vc session id ada", Boolean(vcSid));
if (vcSid) {
  if (r.data?.mode === "mock") {
    r = await req("/api/auth/eid/vc/mock-approve", { method: "POST", body: { sid: vcSid } });
    check("mock approve", r.status === 200 && r.data?.status === "APPROVED", `(${r.status})`);
  } else {
    // mode nyata: kirim webhook sintetis APPROVED (menguji receiver + alur session)
    r = await req("/api/eid/verifier/webhook", {
      method: "POST",
      body: { event_type: "LOGIN_VC", session_id: vcSid, status: "APPROVED", holder_account: { did: "did:eid:e2e-holder", username: "E2E Holder" } },
    });
    check("webhook APPROVED diterima", r.status === 200 && r.data?.status === "APPROVED", `(${r.status} · ${r.data?.status})`);
  }
  cookie = ""; // mulai sesi baru — status akan set cookie sendiri
  r = await req(`/api/auth/eid/vc/status?sid=${vcSid}`);
  check("vc status APPROVED", r.data?.status === "APPROVED", `(${r.data?.status})`);
  check("vc authenticated + user", r.data?.authenticated === true && Boolean(r.data?.user?.id), JSON.stringify(r.data));
  r = await req("/api/auth/me");
  check("session aktif via /me", r.data?.user?.id === r.data?.user?.id && Boolean(r.data?.user), `(${r.data?.user?.name ?? "none"})`);
}

console.log("▶ 12. Register organizer + Admin");
// register organizer baru (email unik per run)
const regEmail = `org-${Date.now()}@test.id`;
r = await req("/api/auth/register/organizer", { method: "POST", body: { name: "Organizer Baru", email: regEmail, orgName: "Komunitas Uji" } });
check("register organizer -> ok + session", r.status === 200 && r.data?.ok && r.data?.user?.role === "ORGANIZER", `(${r.status} · ${r.data?.user?.role})`);
check("org dibuat", Boolean(r.data?.org?.id));
r = await req("/api/auth/me");
check("session organizer baru aktif", r.data?.user?.role === "ORGANIZER", `(${r.data?.user?.role})`);

// login admin demo
r = await req("/api/auth/mock-login", { method: "POST", body: { kind: "admin" } });
check("login admin", r.status === 200 && r.data?.user?.role === "ADMIN", `(${r.status} · ${r.data?.user?.role})`);
r = await req("/api/admin/overview");
check("admin overview 200", r.status === 200 && r.data?.overview?.users > 0, `(${r.status})`);
r = await req("/api/admin/users");
check("admin list users 200", r.status === 200 && Array.isArray(r.data?.users) && r.data.users.length > 0, `(${r.status})`);
// ganti role pengguna uji -> ORGANIZER
const target = (await req("/api/admin/users")).data.users.find((u) => u.email === regEmail);
if (target) {
  r = await req(`/api/admin/users/${target.id}`, { method: "PATCH", body: { role: "ORGANIZER" } });
  check("admin ubah role", r.status === 200 && r.data?.user?.role === "ORGANIZER", `(${r.status})`);
}
// participant tidak boleh akses admin
r = await req("/api/auth/mock-login", { method: "POST", body: { kind: "participant" } });
r = await req("/api/admin/users");
check("participant ditolak akses admin", r.status === 401 || r.status === 403, `(${r.status})`);

console.log(`\n=== HASIL: ${pass} lulus, ${fail} gagal ===`);
process.exit(fail > 0 ? 1 : 0);
