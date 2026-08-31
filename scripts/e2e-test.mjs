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

console.log("▶ 4b. Aktivitas verifikasi panitia TIDAK bisa self-complete");
r = await req(`/api/activities/${qrNode.activityId}/complete`, { method: "POST", body: { method: "UPLOAD", data: { uploadUrl: "demo://foto" } } });
check("self-complete ditolak (VERIFICATION_REQUIRED)", r.status === 403 && r.data?.error?.code === "VERIFICATION_REQUIRED", `(${r.status} · ${r.data?.error?.code})`);

console.log("▶ 5. Verifikasi QR semua aktivitas QR_VERIFY (jalur panitia)");
// login organizer utk ambil device scanner + tes payload palsu
r = await req("/api/auth/mock-login", { method: "POST", body: { kind: "organizer" } });
const devices = await req(`/api/organizer/events/${ev.id}/scanner`);
const devCode = devices.data.devices[0]?.deviceCode;
check("device scanner terotorisasi", Boolean(devCode), JSON.stringify(devices.data.devices));
if (devCode) {
  // smoke test: payload palsu harus ditolak
  r = await req("/api/verification/scan", { method: "POST", body: { payload: JSON.stringify({ v: 1, sid: "fake", nonce: "fake", aid: qrNode.activityId, eid: ev.id, uid: "x", exp: Date.now() + 5000 }), deviceCode: devCode } });
  check("scan payload palsu ditolak", r.status === 400 || r.status === 410, `(${r.status})`);

  // scan NYATA untuk setiap aktivitas yang butuh verifikasi panitia
  const verifyNodes = ev2.data.journey.nodes.filter((n) => ["Menara Jam", "Rasa Legenda", "Panggung Keroncong"].some((x) => n.title.includes(x)));
  check("3 aktivitas butuh verifikasi", verifyNodes.length === 3, `(${verifyNodes.length})`);
  for (const vn of verifyNodes) {
    await req("/api/auth/mock-login", { method: "POST", body: { kind: "participant" } });
    const qr = await req(`/api/activities/${vn.activityId}/qr`, { method: "POST" });
    if (qr.status === 200 && qr.data?.payload) {
      await req("/api/auth/mock-login", { method: "POST", body: { kind: "organizer" } });
      const scan = await req("/api/verification/scan", { method: "POST", body: { payload: qr.data.payload, deviceCode: devCode } });
      check(`scan ${vn.title} -> VERIFIED`, scan.data?.status === "VERIFIED" || scan.data?.status === "DUPLICATE", `(${scan.data?.status} · ${scan.data?.reason ?? ""})`);
    } else {
      check(`QR ${vn.title} dibuat (409 = sudah selesai)`, qr.status === 200 || qr.status === 409, `(${qr.status})`);
    }
  }
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
// selesaikan aktivitas tersisa utk memenuhi EVENT_COMPLETION
// (aktivitas QR_VERIFY sudah diselesaikan via scan panitia di step 5)
const remaining = ev2.data.journey.nodes.filter((n) => !["Sandi Pusaka", "Tulis Harapan", "Menara Jam", "Rasa Legenda", "Panggung Keroncong"].some((x) => n.title.includes(x)));
for (const n of remaining) {
  r = await req(`/api/activities/${n.activityId}/complete`, { method: "POST", body: { method: "AUTO", data: { via: "e2e" } } });
  if (r.data?.message !== "COMPLETED" && r.data?.message !== "ALREADY_COMPLETED" && r.status !== 403) {
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

console.log("▶ 13. Kuota & waiting list (gratis/berbayar)");
r = await req("/api/auth/mock-login", { method: "POST", body: { kind: "organizer" } });
r = await req("/api/organizer/events", { method: "POST", body: { name: `Event Kuota ${Date.now()}`, pricingModel: "PAID", price: 50000, quota: 1, journeyMode: "LINEAR" } });
const qev = r.data.event;
check("event berbayar + kuota 1 dibuat", r.status === 200 && Boolean(qev?.id), `(${r.status})`);
if (qev?.id) {
  await req(`/api/organizer/events/${qev.id}/publish`, { method: "POST", body: { status: "PUBLISHED" } });
  // peserta 1 (Putri) masuk
  r = await req("/api/auth/mock-login", { method: "POST", body: { kind: "participant" } });
  r = await req(`/api/events/${qev.id}/join`, { method: "POST" });
  check("peserta 1 JOINED", r.data?.joined === true, `(${r.data?.message})`);
  // peserta 2 (user baru via register) → kuota penuh → waiting list
  r = await req("/api/auth/register/organizer", { method: "POST", body: { name: "User Dua", email: `dua-${Date.now()}@test.id`, orgName: "Org Dua" } });
  check("register user kedua", r.status === 200 && r.data?.ok, `(${r.status})`);
  r = await req(`/api/events/${qev.id}/join`, { method: "POST" });
  check("peserta 2 -> WAITLIST", r.data?.waitlisted === true && r.data?.status === "WAITLIST", `(${r.data?.message})`);
  r = await req(`/api/events/${qev.id}`);
  check("detail: pricing PAID + quota 1", r.data?.event?.pricing?.model === "PAID" && r.data?.event?.quota === 1, JSON.stringify(r.data?.event?.pricing));
  check("detail: waitlistCount 1", r.data?.event?.waitlistCount === 1, `(${r.data?.event?.waitlistCount})`);
  // EO approve
  r = await req("/api/auth/mock-login", { method: "POST", body: { kind: "organizer" } });
  const qbundle = await req(`/api/organizer/events/${qev.id}`);
  const wl = qbundle.data.event.waitlist?.[0];
  check("waitlist terlihat oleh EO", Boolean(wl), JSON.stringify(qbundle.data.event.waitlist));
  if (wl) {
    r = await req(`/api/organizer/events/${qev.id}/waitlist/${wl.id}`, { method: "POST", body: { action: "approve" } });
    check("approve -> JOINED", r.data?.status === "JOINED", `(${r.data?.status})`);
  }
  r = await req(`/api/events/${qev.id}`);
  check("setelah approve: confirmed 2, waitlist 0", r.data?.event?.confirmedCount === 2 && r.data?.event?.waitlistCount === 0, `(${r.data?.event?.confirmedCount}/${r.data?.event?.waitlistCount})`);
}

console.log("▶ 14. Hapus draft event (organizer)");
r = await req("/api/auth/mock-login", { method: "POST", body: { kind: "organizer" } });
r = await req("/api/organizer/events", { method: "POST", body: { name: `Draft Hapus ${Date.now()}` } });
const delEv = r.data.event;
check("draft dibuat", r.status === 200 && Boolean(delEv?.id), `(${r.status})`);
if (delEv?.id) {
  r = await req(`/api/organizer/events/${delEv.id}`, { method: "DELETE" });
  check("draft terhapus", r.data?.ok === true, `(${r.status} ${r.data?.error?.code ?? ""})`);
  r = await req(`/api/organizer/events/${delEv.id}`, { method: "DELETE" });
  check("hapus lagi -> 404", r.status === 404, `(${r.status})`);
  // published tidak bisa dihapus
  r = await req("/api/organizer/events", { method: "POST", body: { name: `Draft Publikasi ${Date.now()}` } });
  const pubEv = r.data.event;
  if (pubEv?.id) {
    const pubRes = await req(`/api/organizer/events/${pubEv.id}/publish`, { method: "POST", body: { status: "PUBLISHED" } });
    check("publish set PUBLISHED", pubRes.status === 200 && pubRes.data?.event?.status === "PUBLISHED", `(${pubRes.status} ${JSON.stringify(pubRes.data)})`);
    r = await req(`/api/organizer/events/${pubEv.id}`, { method: "DELETE" });
    check("event PUBLISHED tidak bisa dihapus (409)", r.status === 409, `(${r.status} ${r.data?.error?.code ?? ""})`);
  }
}

console.log("▶ 15. Pilih jadi penyelenggara (ensure) — tanpa pemetaan role saat daftar");
r = await req("/api/auth/mock-login", { method: "POST", body: { kind: "participant" } });
r = await req("/api/organizer/ensure", { method: "POST" });
check("ensure -> ORGANIZER + org pribadi", r.data?.ok === true && r.data?.role === "ORGANIZER" && Boolean(r.data?.org?.id), JSON.stringify(r.data));
r = await req("/api/organizer/ensure", { method: "POST" });
check("ensure idempoten (ALREADY)", r.data?.status === "ALREADY", `(${r.data?.status})`);
r = await req("/api/auth/me");
check("sesi baru ber-role ORGANIZER", r.data?.user?.role === "ORGANIZER", `(${r.data?.user?.role})`);
r = await req("/api/organizer/events", { method: "POST", body: { name: `Event EO Baru ${Date.now()}` } });
check("langsung bisa buat event sbg EO", r.status === 200 && Boolean(r.data?.event?.id), `(${r.status})`);

console.log("▶ 16. Super Admin (email di SUPER_ADMIN_EMAILS -> ADMIN)");
r = await req("/api/auth/eid/vc/start", { method: "POST" });
const saSid = r.data?.sessionId;
if (saSid) {
  r = await req("/api/eid/verifier/webhook", {
    method: "POST",
    body: { event_type: "LOGIN_VC", session_id: saSid, status: "APPROVED", holder_account: { did: "did:eid:e2e-superadmin", username: "andrew.yapvito@gmail.com" } },
  });
  check("webhook super admin diterima", r.data?.status === "APPROVED", `(${r.data?.status})`);
  r = await req(`/api/auth/eid/vc/status?sid=${saSid}`);
  check("login -> role ADMIN (super admin)", r.data?.user?.role === "ADMIN", `(${r.data?.user?.role})`);
  r = await req("/api/auth/me");
  check("sesi admin aktif", r.data?.user?.role === "ADMIN", `(${r.data?.user?.role})`);
}

console.log("▶ 17. Aktivitas baru: stempel tersimpan (regresi stampId)");
r = await req("/api/auth/mock-login", { method: "POST", body: { kind: "organizer" } });
r = await req(`/api/organizer/events/${ev2.data.event.id}/stamps`, { method: "POST", body: { name: "Stempel Tes", emoji: "⭐" } });
const newStampId = r.data?.stamp?.id;
if (newStampId) {
  r = await req(`/api/organizer/events/${ev2.data.event.id}/activities`, { method: "POST", body: { title: `Aktivitas Stempel ${Date.now()}`, type: "CUSTOM", completionMethod: "AUTO", stampId: newStampId } });
  const stActId = r.data?.activity?.id;
  const bundle = await req(`/api/organizer/events/${ev2.data.event.id}`);
  const stAct = bundle.data.activities?.find((a) => a.id === stActId);
  check("stampId tersimpan di aktivitas baru", stAct?.stampId === newStampId, `(${stAct?.stampId} vs ${newStampId})`);
}

console.log(`\n=== HASIL: ${pass} lulus, ${fail} gagal ===`);
process.exit(fail > 0 ? 1 : 0);
