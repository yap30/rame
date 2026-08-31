// ============================================================
// RAME — Seed data demo
// Event utama: "Jelajah Kota Tua" (kota fiktif Semilir)
// + 3 event lain untuk mesin rekomendasi
// + partisipasi fiktif agar analytics/insights/replay hidup
//
// Jalankan: npm run db:push && npm run db:seed
// ============================================================
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DAY = 24 * 60 * 60 * 1000;

async function reset() {
  // hapus urutan dependensi (anak dulu)
  await prisma.feedbackAnswer.deleteMany();
  await prisma.feedbackResponse.deleteMany();
  await prisma.feedbackQuestion.deleteMany();
  await prisma.feedbackForm.deleteMany();
  await prisma.credentialEvent.deleteMany();
  await prisma.credentialIssuance.deleteMany();
  await prisma.credentialConfig.deleteMany();
  await prisma.participantAchievement.deleteMany();
  await prisma.achievement.deleteMany();
  await prisma.participantStamp.deleteMany();
  await prisma.stamp.deleteMany();
  await prisma.xpTransaction.deleteMany();
  await prisma.activityVerification.deleteMany();
  await prisma.qrSession.deleteMany();
  await prisma.offlineTransaction.deleteMany();
  await prisma.scannerDevice.deleteMany();
  await prisma.activityCompletion.deleteMany();
  await prisma.journeyEdge.deleteMany();
  await prisma.journeyNode.deleteMany();
  await prisma.journey.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.activityTemplate.deleteMany();
  await prisma.eventParticipant.deleteMany();
  await prisma.eventMediaPartner.deleteMany();
  await prisma.eventCommunity.deleteMany();
  await prisma.mediaPartner.deleteMany();
  await prisma.community.deleteMany();
  await prisma.event.deleteMany();
  await prisma.venue.deleteMany();
  await prisma.organizationMember.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.externalIdentity.deleteMany();
  await prisma.user.deleteMany();
  await prisma.eventLog.deleteMany();
  await prisma.insight.deleteMany();
  await prisma.insightRule.deleteMany();
  console.log("✓ database dibersihkan");
}

async function main() {
  await reset();

  // ---------- Insight rules ----------
  const ruleDropOff = await prisma.insightRule.create({
    data: { key: "drop_off_gap", name: "Deteksi drop-off antar titik", description: "Jika penyelesaian antar node berurutan turun > 35%, tandai titik gesekan.", thresholdJson: { gapPct: 35 } },
  });
  const ruleLowFeedback = await prisma.insightRule.create({
    data: { key: "low_feedback_score", name: "Skor umpan balik rendah", description: "Jika rata-rata rating < 3.5 dari 5.", thresholdJson: { minScore: 3.5 } },
  });
  const ruleVerifyFailure = await prisma.insightRule.create({
    data: { key: "verify_failure_rate", name: "Tingkat kegagalan verifikasi", description: "Jika kegagalan verifikasi > 15% dari total scan.", thresholdJson: { maxRate: 0.15 } },
  });
  await prisma.insightRule.create({
    data: { key: "reward_participation", name: "Partisipasi reward rendah", description: "Jika peserta dengan stempel < 30% dari peserta gabung.", thresholdJson: { minRate: 0.3 } },
  });
  const RULE_DROP = ruleDropOff.id;
  const RULE_FEED = ruleLowFeedback.id;
  const RULE_VERIFY = ruleVerifyFailure.id;

  // ---------- Users ----------
  const putri = await prisma.user.create({
    data: {
      name: "Putri Anggraini",
      email: "putri@semilir.id",
      role: "PARTICIPANT",
      avatarUrl: "",
      externalIdentities: {
        create: {
          provider: "e.id",
          providerSubject: "did:idchain:demo:putri",
          providerEmail: "putri@semilir.id",
          profileJson: { name: "Putri Anggraini", email: "putri@semilir.id", trustLevel: "Moderate — Tier 2", kyc: "email+phone+id" },
        },
      },
    },
  });

  const rara = await prisma.user.create({
    data: {
      name: "Rara Semilir",
      email: "rara@semilir.id",
      role: "ORGANIZER",
      externalIdentities: {
        create: {
          provider: "e.id",
          providerSubject: "did:idchain:demo:rara",
          providerEmail: "rara@semilir.id",
          profileJson: { name: "Rara Semilir", trustLevel: "Moderate — Tier 2" },
        },
      },
    },
  });

  const adminRame = await prisma.user.create({
    data: {
      name: "Admin RAME",
      email: "admin@rame.id",
      role: "ADMIN",
      externalIdentities: {
        create: {
          provider: "e.id",
          providerSubject: "did:idchain:demo:admin",
          providerEmail: "admin@rame.id",
          profileJson: { name: "Admin RAME", trustLevel: "Tier 2" },
        },
      },
    },
  });

  const budi = await prisma.user.create({ data: { name: "Budi Santoso", email: "budi@semilir.id", role: "PARTICIPANT" } });
  const sari = await prisma.user.create({ data: { name: "Sari Wulandari", email: "sari@semilir.id", role: "PARTICIPANT" } });
  const dimas = await prisma.user.create({ data: { name: "Dimas Prasetyo", email: "dimas@semilir.id", role: "PARTICIPANT" } });
  const alya = await prisma.user.create({ data: { name: "Alya Ramadhani", email: "alya@semilir.id", role: "PARTICIPANT" } });

  // ---------- Organisasi ----------
  const org = await prisma.organization.create({
    data: {
      name: "Komunitas Semilir Heritage",
      slug: "semilir-heritage",
      description: "Komunitas pelestari warisan dan budaya Kota Semilir.",
      members: {
        create: [
          { userId: rara.id, role: "EO" },
          { userId: budi.id, role: "COMMUNITY" },
          { userId: sari.id, role: "COMMUNITY" },
        ],
      },
    },
  });

  // ---------- Venue / Community / Media ----------
  const alun = await prisma.venue.create({ data: { name: "Alun-Alun Semilir", city: "Semilir", address: "Jl. Pahlawan No. 1" } });
  const lapangan = await prisma.venue.create({ data: { name: "Lapangan Semilir", city: "Semilir" } });
  const pasarMalam = await prisma.venue.create({ data: { name: "Pasar Malam Semilir", city: "Semilir" } });
  const tamanBuana = await prisma.venue.create({ data: { name: "Taman Buana", city: "Semilir" } });

  const komunitasHeritage = await prisma.community.create({ data: { name: "Pecinta Kota Tua Semilir", description: "Komunitas pegiat heritage" } });
  const komunitasSeni = await prisma.community.create({ data: { name: "Sanggar Tari Semilir", description: "Sanggar seni tradisional" } });
  const komunitasKuliner = await prisma.community.create({ data: { name: "Kawan Rasa Semilir", description: "Komunitas kuliner lokal" } });

  const mediaA = await prisma.mediaPartner.create({ data: { name: "Radio Semilir FM", url: "https://semilir.example" } });
  const mediaB = await prisma.mediaPartner.create({ data: { name: "Semilir Post", url: "https://semilirpost.example" } });

  // ---------- Event utama: Jelajah Kota Tua ----------
  const now = new Date();
  const ev = await prisma.event.create({
    data: {
      slug: "jelajah-kota-tua",
      name: "Jelajah Kota Tua",
      tagline: "Satu malam, lima penanda, dan cerita yang menunggu untuk dikumpulkan.",
      description: "Festival malam menjelajahi kawasan Kota Tua Semilir: fotografi, kuliner legendaris, kuis pusaka, keroncong, dan harapan yang ditulis untuk kota.",
      story:
        "Setiap malam, lampu Kota Tua menyala pelan — dan jalan-jalan lamanya mulai bercerita. Jelajah Kota Tua adalah festival malam yang mengajakmu berjalan kaki melewati Menara Jam, berhenti di kedai legenda, menguji ingatanmu tentang pusaka, duduk di bawah panggung keroncong, dan meninggalkan sebaris harapan untuk kota.\n\nLima penanda, lima stempel, dan satu malam yang tidak akan kamu lupakan. Bawa ponselmu, hubungkan e.id-mu, dan mulailah menjelajah.",
      city: "Semilir",
      journeyMode: "HYBRID",
      status: "PUBLISHED",
      startsAt: new Date(now.getTime() - 1 * DAY),
      endsAt: new Date(now.getTime() + 14 * DAY),
      organizationId: org.id,
      venueId: alun.id,
      coverUrl: "",
      identityJson: {
        eventShortName: "Jelajah Kota Tua",
        logoEmoji: "🕰️",
        brand: "#1e3a34",
        brandSoft: "#e4ece5",
        brandInk: "#ffffff",
        accent: "#d97706",
        accentSoft: "#fdf0dc",
        gold: "#b98a1a",
        ink: "#22302c",
        paper: "#f8f4ea",
        fontDisplay: "Fraunces",
        fontSans: "Plus Jakarta Sans",
      },
      communities: { create: [{ communityId: komunitasHeritage.id }, { communityId: komunitasSeni.id }] },
      mediaPartners: { create: [{ mediaPartnerId: mediaA.id }, { mediaPartnerId: mediaB.id }] },
    },
  });

  // ---------- Stamps & Achievements ----------
  const sMenara = await prisma.stamp.create({ data: { eventId: ev.id, name: "Lampu Kota", description: "Tantangan foto Menara Jam", emoji: "🕰️", color: "#b45309", rarity: 1, sortOrder: 1 } });
  const sRasa = await prisma.stamp.create({ data: { eventId: ev.id, name: "Kolektor Rasa", description: "Mencicipi tiga rasa legenda", emoji: "🍢", color: "#b91c1c", rarity: 2, sortOrder: 2 } });
  const sCerdas = await prisma.stamp.create({ data: { eventId: ev.id, name: "Cerdas Cermat", description: "Menjawab kuis pusaka", emoji: "🧠", color: "#1d4ed8", rarity: 1, sortOrder: 3 } });
  const sHarmoni = await prisma.stamp.create({ data: { eventId: ev.id, name: "Malam Harmoni", description: "Hadir di panggung keroncong", emoji: "🎻", color: "#7c3aed", rarity: 2, sortOrder: 4 } });
  const sCerita = await prisma.stamp.create({ data: { eventId: ev.id, name: "Penulis Cerita", description: "Menulis harapan untuk kota", emoji: "✍️", color: "#0e7490", rarity: 1, sortOrder: 5 } });

  const aLangkah = await prisma.achievement.create({ data: { eventId: ev.id, name: "Langkah Pertama", description: "Selesaikan 1 aktivitas", emoji: "👣", conditionType: "N_ACTIVITIES", conditionValue: 1, sortOrder: 1 } });
  const achRasa = await prisma.achievement.create({ data: { eventId: ev.id, name: "Kolektor Rasa", description: "Kumpulkan 3 stempel berbeda", emoji: "🍢", conditionType: "STAMPS_COUNT", conditionValue: 3, sortOrder: 2 } });
  const aMalam = await prisma.achievement.create({ data: { eventId: ev.id, name: "Penjelajah Malam", description: "Selesaikan seluruh 5 aktivitas", emoji: "🌙", conditionType: "ALL_ACTIVITIES", conditionValue: 5, sortOrder: 3 } });

  // ---------- Aktivitas ----------
  const aMenara = await prisma.activity.create({
    data: {
      eventId: ev.id, title: "Menara Jam", sortOrder: 1, icon: "🕰️",
      type: "PHOTO", completionMethod: "QR_VERIFY", verificationRequired: true, repeatable: false,
      xpReward: 100, stampId: sMenara.id,
      description: "Abadikan momen paling sinematik di bawah Menara Jam — lampu kuningnya baru menyala setelah gelap.",
    },
  });
  const aRasa = await prisma.activity.create({
    data: {
      eventId: ev.id, title: "Rasa Legenda", sortOrder: 2, icon: "🍢",
      type: "CUSTOM", completionMethod: "QR_VERIFY", verificationRequired: true, repeatable: false,
      xpReward: 150, stampId: sRasa.id,
      description: "Kunjungi tiga kedai legenda di Jalan Pasar — sate klathak, wedang ronde, dan jajanan pasar. Scan QR di kedai ketiga untuk stempel.",
    },
  });
  const aSandi = await prisma.activity.create({
    data: {
      eventId: ev.id, title: "Sandi Pusaka", sortOrder: 3, icon: "🧠",
      type: "QUIZ", completionMethod: "AUTO", verificationRequired: false, repeatable: false,
      xpReward: 80, stampId: sCerdas.id,
      description: "Uji ingatanmu tentang pusaka Kota Semilir. Jawab benar ketiga pertanyaan untuk menyelesaikan aktivitas.",
      configJson: {
        questions: [
          { q: "Menara Jam Semilir dibangun pada tahun berapa?", options: ["1892", "1901", "1925"], answer: 1 },
          { q: "Apa nama kesenian khas Semilir yang dimainkan di panggung malam?", options: ["Kecak", "Keroncong", "Angklung"], answer: 1 },
          { q: "Jalan Pasar di Kota Tua Semilir terkenal dengan jajanan apa?", options: ["Sate klathak", "Gudeg", "Rendang"], answer: 0 },
        ],
      },
    },
  });
  const aPanggung = await prisma.activity.create({
    data: {
      eventId: ev.id, title: "Panggung Keroncong", sortOrder: 4, icon: "🎻",
      type: "QR_CHECKIN", completionMethod: "QR_VERIFY", verificationRequired: true, repeatable: false,
      xpReward: 120, stampId: sHarmoni.id,
      description: "Duduklah sejenak di bawah panggung keroncong Alun-Alun. Satu lagu, lalu scan QR check-in di pintu panggung.",
    },
  });
  const aHarapan = await prisma.activity.create({
    data: {
      eventId: ev.id, title: "Tulis Harapan", sortOrder: 5, icon: "✍️",
      type: "FEEDBACK", completionMethod: "AUTO", verificationRequired: false, repeatable: false,
      xpReward: 50, stampId: sCerita.id,
      description: "Tinggalkan sebaris harapan untuk Kota Semilir di papan harapan digital. Selesai otomatis saat kamu menulis.",
    },
  });

  // ---------- Journey ----------
  const journey = await prisma.journey.create({ data: { eventId: ev.id, mode: "HYBRID", title: "Lima Penanda Malam" } });
  const n1 = await prisma.journeyNode.create({ data: { journeyId: journey.id, activityId: aMenara.id, position: 0 } });
  const n2 = await prisma.journeyNode.create({ data: { journeyId: journey.id, activityId: aRasa.id, position: 1 } });
  const n3 = await prisma.journeyNode.create({ data: { journeyId: journey.id, activityId: aSandi.id, position: 2 } });
  const n4 = await prisma.journeyNode.create({ data: { journeyId: journey.id, activityId: aPanggung.id, position: 3 } });
  const n5 = await prisma.journeyNode.create({ data: { journeyId: journey.id, activityId: aHarapan.id, position: 4 } });
  await prisma.journeyEdge.createMany({
    data: [
      { journeyId: journey.id, fromNodeId: n1.id, toNodeId: n2.id, required: true },
      { journeyId: journey.id, fromNodeId: n2.id, toNodeId: n3.id, required: false, label: "bebas" },
      { journeyId: journey.id, fromNodeId: n3.id, toNodeId: n4.id, required: true },
      { journeyId: journey.id, fromNodeId: n4.id, toNodeId: n5.id, required: true },
    ],
  });

  // ---------- Credential config ----------
  const credConfig = await prisma.credentialConfig.create({
    data: {
      eventId: ev.id, enabled: true,
      title: "Sertifikat Jelajah Kota Tua",
      description: "Bukti digital penyelesaian festival Jelajah Kota Tua 2026.",
      schemaId: "rame-jelajah-kota-tua-2026",
      eligibilityPolicy: "EVENT_COMPLETION",
      issuerOrgName: "Komunitas Semilir Heritage",
    },
  });

  // ---------- Feedback form ----------
  const form = await prisma.feedbackForm.create({
    data: {
      eventId: ev.id, title: "Umpan Balik Jelajah Kota Tua", required: true,
      questions: {
        create: [
          { prompt: "Bagaimana penilaianmu terhadap event ini secara keseluruhan?", type: "RATING", required: true, sortOrder: 0 },
          { prompt: "Seberapa jelas Experience Map-nya?", type: "RATING", required: true, sortOrder: 1 },
          { prompt: "Cerita singkat pengalaman terbaikmu malam ini", type: "TEXT", required: false, sortOrder: 2 },
          { prompt: "Apakah kamu akan merekomendasikan event ini ke teman?", type: "CHOICE", required: true, sortOrder: 3, optionsJson: { options: ["Sangat mungkin", "Mungkin", "Tidak"] } },
        ],
      },
    },
  });

  // ---------- Templates ----------
  await prisma.activityTemplate.createMany({
    data: [
      { name: "Tantangan Foto", description: "Unggah foto bertema", type: "PHOTO", defaultConfigJson: { prompt: "Unggah foto terbaikmu" } },
      { name: "Kuis Heritage", description: "Kuis pilihan ganda", type: "QUIZ", defaultConfigJson: {} },
      { name: "Check-in Lokasi", description: "Scan QR di lokasi", type: "QR_CHECKIN", defaultConfigJson: {} },
      { name: "Pencicipan Kuliner", description: "Kunjungi kedai & scan", type: "CUSTOM", defaultConfigJson: {} },
    ],
  });

  // ---------- Event lain (untuk rekomendasi) ----------
  const evSeni = await prisma.event.create({
    data: {
      slug: "pasar-seni-minggu", name: "Pasar Seni Minggu Pagi", tagline: "Kriya, musik akustik, dan kopi di lapangan.",
      description: "Pasar seni mingguan dengan 40 stan kriya, panggung akustik, dan bazar kopi Semilir.", city: "Semilir",
      journeyMode: "FREE_EXPLORATION", status: "PUBLISHED",
      startsAt: new Date(now.getTime() + 3 * DAY), endsAt: new Date(now.getTime() + 3 * DAY + 6 * 3600e3),
      organizationId: org.id, venueId: lapangan.id,
      identityJson: { eventShortName: "Pasar Seni", logoEmoji: "🎨", brand: "#6d28d9", brandSoft: "#f3e8ff", brandInk: "#ffffff", accent: "#db2777", accentSoft: "#fce7f3", gold: "#a16207", ink: "#2a2438", paper: "#faf8ff" },
      communities: { create: [{ communityId: komunitasSeni.id }] },
      mediaPartners: { create: [{ mediaPartnerId: mediaB.id }] },
    },
  });
  await prisma.activity.createMany({
    data: [
      { eventId: evSeni.id, title: "Jalan-jalan Stan Kriya", sortOrder: 1, type: "SCAVENGER", completionMethod: "AUTO", xpReward: 60, icon: "🧺", description: "Kunjungi minimal 5 stan kriya." },
      { eventId: evSeni.id, title: "Setlist Panggung Akustik", sortOrder: 2, type: "QR_CHECKIN", completionMethod: "QR_VERIFY", verificationRequired: true, xpReward: 90, icon: "🎸", description: "Check-in di panggung akustik." },
      { eventId: evSeni.id, title: "Cicip Kopi Semilir", sortOrder: 3, type: "CUSTOM", completionMethod: "AUTO", xpReward: 40, icon: "☕", description: "Rasakan satu gelas kopi lokal." },
    ],
  });

  const evKuliner = await prisma.event.create({
    data: {
      slug: "rame-rame-culinary", name: "Rame-Rame Culinary Night", tagline: "Satu lorong, seratus rasa.",
      description: "Festival kuliner malam di Pasar Malam Semilir: dari jajanan pasar hingga hidangan legenda.", city: "Semilir",
      journeyMode: "HYBRID", status: "PUBLISHED",
      startsAt: new Date(now.getTime() + 10 * DAY), endsAt: new Date(now.getTime() + 10 * DAY + 7 * 3600e3),
      organizationId: org.id, venueId: pasarMalam.id,
      identityJson: { eventShortName: "Rame-Rame", logoEmoji: "🍜", brand: "#b91c1c", brandSoft: "#fee2e2", brandInk: "#ffffff", accent: "#f59e0b", accentSoft: "#fef3c7", gold: "#b45309", ink: "#2b2222", paper: "#fffaf5" },
      communities: { create: [{ communityId: komunitasKuliner.id }] },
      mediaPartners: { create: [{ mediaPartnerId: mediaA.id }] },
    },
  });
  await prisma.activity.createMany({
    data: [
      { eventId: evKuliner.id, title: "Lorong Legenda", sortOrder: 1, type: "CUSTOM", completionMethod: "QR_VERIFY", verificationRequired: true, xpReward: 120, icon: "🍢", description: "Scan di kedai legenda lorong utara." },
      { eventId: evKuliner.id, title: "Jajanan Pasar Bingo", sortOrder: 2, type: "SCAVENGER", completionMethod: "AUTO", xpReward: 70, icon: "🎯", description: "Temukan 3 jajanan yang ada di kartu bingo." },
      { eventId: evKuliner.id, title: "Makan Malam Bareng", sortOrder: 3, type: "CUSTOM", completionMethod: "AUTO", xpReward: 50, icon: "🍽️", description: "Makan malam di meja bersama." },
    ],
  });

  const evMusik = await prisma.event.create({
    data: {
      slug: "semilir-music-light", name: "Semilir Music & Light Festival", tagline: "Panggung cahaya di tepi Taman Buana.",
      description: "Dua panggung, instalasi cahaya, dan penutup kembang api.", city: "Semilir",
      journeyMode: "BRANCHING", status: "PUBLISHED",
      startsAt: new Date(now.getTime() + 17 * DAY), endsAt: new Date(now.getTime() + 18 * DAY),
      organizationId: org.id, venueId: tamanBuana.id,
      identityJson: { eventShortName: "Music & Light", logoEmoji: "✨", brand: "#0e7490", brandSoft: "#cffafe", brandInk: "#ffffff", accent: "#f43f5e", accentSoft: "#ffe4e6", gold: "#d97706", ink: "#16242a", paper: "#f6fbfc" },
      communities: { create: [{ communityId: komunitasSeni.id }] },
      mediaPartners: { create: [{ mediaPartnerId: mediaB.id }] },
    },
  });
  await prisma.activity.createMany({
    data: [
      { eventId: evMusik.id, title: "Panggung Utama", sortOrder: 1, type: "QR_CHECKIN", completionMethod: "QR_VERIFY", verificationRequired: true, xpReward: 100, icon: "🎤", description: "Check-in di panggung utama." },
      { eventId: evMusik.id, title: "Jalur Cahaya", sortOrder: 2, type: "SCAVENGER", completionMethod: "AUTO", xpReward: 60, icon: "💡", description: "Kunjungi 4 instalasi cahaya." },
    ],
  });

  // ---------- Partisipasi fiktif (untuk analytics) ----------
  const log = (eventId: string, userId: string | null, action: string, actorType: string, dataJson: unknown) =>
    prisma.eventLog.create({ data: { eventId, userId, action, actorType, dataJson: dataJson as object } });

  // Putri (demo user) — sudah gabung E1, selesai Sandi Pusaka
  await prisma.eventParticipant.create({ data: { eventId: ev.id, userId: putri.id } });
  await log(ev.id, putri.id, "EVENT_JOINED", "PARTICIPANT", { source: "discover" });
  const putriComp = await prisma.activityCompletion.create({
    data: { activityId: aSandi.id, eventId: ev.id, userId: putri.id, method: "AUTO", idempotencyKey: `demo:putri:${aSandi.id}`, dataJson: { score: 3, total: 3 } },
  });
  await prisma.participantStamp.create({ data: { userId: putri.id, stampId: sCerdas.id, eventId: ev.id, completionId: putriComp.id, idempotencyKey: `demo:putri:stamp:${sCerdas.id}` } });
  await prisma.xpTransaction.create({ data: { userId: putri.id, eventId: ev.id, amount: 80, reason: "Aktivitas: Sandi Pusaka", idempotencyKey: `demo:putri:xp:${aSandi.id}` } });
  await prisma.participantAchievement.create({ data: { userId: putri.id, achievementId: aLangkah.id, eventId: ev.id, idempotencyKey: `demo:putri:ach:${aLangkah.id}` } });
  await log(ev.id, putri.id, "ACTIVITY_STARTED", "PARTICIPANT", { activityId: aSandi.id });
  await log(ev.id, putri.id, "ACTIVITY_COMPLETED", "PARTICIPANT", { activityId: aSandi.id });
  await log(ev.id, putri.id, "STAMP_AWARDED", "SYSTEM", { stampId: sCerdas.id, stamp: "Cerdas Cermat" });
  await log(ev.id, putri.id, "XP_AWARDED", "SYSTEM", { amount: 80 });
  await log(ev.id, putri.id, "ACHIEVEMENT_UNLOCKED", "SYSTEM", { achievementId: aLangkah.id });

  // Budi — 2 aktivitas QR (verifikasi online)
  await prisma.eventParticipant.create({ data: { eventId: ev.id, userId: budi.id } });
  await log(ev.id, budi.id, "EVENT_JOINED", "PARTICIPANT", { source: "recommendation" });
  for (const [act, st, xp] of [[aMenara, sMenara, 100], [aSandi, sCerdas, 80]] as const) {
    const c = await prisma.activityCompletion.create({
      data: { activityId: act.id, eventId: ev.id, userId: budi.id, method: act.id === aMenara.id ? "QR_VERIFY" : "AUTO", idempotencyKey: `demo:budi:${act.id}`, dataJson: act.id === aMenara.id ? { photoUrl: "demo://menara" } : { score: 2, total: 3 } },
    });
    await prisma.participantStamp.create({ data: { userId: budi.id, stampId: st.id, eventId: ev.id, completionId: c.id, idempotencyKey: `demo:budi:stamp:${st.id}` } });
    await prisma.xpTransaction.create({ data: { userId: budi.id, eventId: ev.id, amount: xp, reason: `Aktivitas: ${act.title}`, idempotencyKey: `demo:budi:xp:${act.id}` } });
    await log(ev.id, budi.id, "ACTIVITY_COMPLETED", "PARTICIPANT", { activityId: act.id });
    await log(ev.id, budi.id, "STAMP_AWARDED", "SYSTEM", { stampId: st.id });
    await log(ev.id, budi.id, "XP_AWARDED", "SYSTEM", { amount: xp });
    if (act.id === aMenara.id) await log(ev.id, budi.id, "VERIFICATION_COMPLETED", "SCANNER", { method: "ONLINE", status: "VERIFIED" });
  }
  await prisma.participantAchievement.create({ data: { userId: budi.id, achievementId: aLangkah.id, eventId: ev.id, idempotencyKey: `demo:budi:ach:${aLangkah.id}` } });
  await log(ev.id, budi.id, "ACHIEVEMENT_UNLOCKED", "SYSTEM", { achievementId: aLangkah.id });
  // 1 scan gagal (QR kedaluwarsa) untuk metrik kegagalan verifikasi
  await log(ev.id, budi.id, "SCAN_REJECTED", "SCANNER", { reason: "QR_EXPIRED" });

  // Sari — 4 aktivitas + feedback
  await prisma.eventParticipant.create({ data: { eventId: ev.id, userId: sari.id } });
  await log(ev.id, sari.id, "EVENT_JOINED", "PARTICIPANT", { source: "discover" });
  for (const [act, st, xp] of [[aMenara, sMenara, 100], [aRasa, sRasa, 150], [aSandi, sCerdas, 80], [aPanggung, sHarmoni, 120]] as const) {
    const c = await prisma.activityCompletion.create({
      data: { activityId: act.id, eventId: ev.id, userId: sari.id, method: act.id === aSandi.id ? "AUTO" : "QR_VERIFY", idempotencyKey: `demo:sari:${act.id}`, dataJson: act.id === aSandi.id ? { score: 3, total: 3 } : {} },
    });
    await prisma.participantStamp.create({ data: { userId: sari.id, stampId: st.id, eventId: ev.id, completionId: c.id, idempotencyKey: `demo:sari:stamp:${st.id}` } });
    await prisma.xpTransaction.create({ data: { userId: sari.id, eventId: ev.id, amount: xp, reason: `Aktivitas: ${act.title}`, idempotencyKey: `demo:sari:xp:${act.id}` } });
    await log(ev.id, sari.id, "ACTIVITY_COMPLETED", "PARTICIPANT", { activityId: act.id });
    await log(ev.id, sari.id, "STAMP_AWARDED", "SYSTEM", { stampId: st.id });
    await log(ev.id, sari.id, "XP_AWARDED", "SYSTEM", { amount: xp });
    if (act.id !== aSandi.id) await log(ev.id, sari.id, "VERIFICATION_COMPLETED", "SCANNER", { method: "ONLINE", status: "VERIFIED" });
  }
  await prisma.participantAchievement.createMany({
    data: [
      { userId: sari.id, achievementId: aLangkah.id, eventId: ev.id, idempotencyKey: `demo:sari:ach:${aLangkah.id}` },
      { userId: sari.id, achievementId: achRasa.id, eventId: ev.id, idempotencyKey: `demo:sari:ach:${achRasa.id}` },
    ],
  });
  await log(ev.id, sari.id, "ACHIEVEMENT_UNLOCKED", "SYSTEM", { achievementId: aLangkah.id });
  await log(ev.id, sari.id, "ACHIEVEMENT_UNLOCKED", "SYSTEM", { achievementId: achRasa.id });
  const sariResp = await prisma.feedbackResponse.create({
    data: { formId: form.id, userId: sari.id, eventId: ev.id, idempotencyKey: `demo:sari:feedback` },
  });
  const qs = await prisma.feedbackQuestion.findMany({ where: { formId: form.id }, orderBy: { sortOrder: "asc" } });
  await prisma.feedbackAnswer.createMany({
    data: [
      { responseId: sariResp.id, questionId: qs[0].id, value: "5" },
      { responseId: sariResp.id, questionId: qs[1].id, value: "4" },
      { responseId: sariResp.id, questionId: qs[2].id, value: "Keroncong di bawah lampu Alun-Alun, magis!" },
      { responseId: sariResp.id, questionId: qs[3].id, value: "Sangat mungkin" },
    ],
  });
  await log(ev.id, sari.id, "FEEDBACK_SUBMITTED", "PARTICIPANT", { score: 4.5 });
  // Sari eligible credential (belum claim)
  await prisma.credentialIssuance.create({
    data: { credentialConfigId: credConfig.id, userId: sari.id, eventId: ev.id, status: "ELIGIBLE", idempotencyKey: `demo:sari:cred` },
  });
  await log(ev.id, sari.id, "CREDENTIAL_ELIGIBLE", "SYSTEM", { configId: credConfig.id });

  // Alya — selesai semua 5 + feedback + credential ISSUED
  await prisma.eventParticipant.create({ data: { eventId: ev.id, userId: alya.id, status: "COMPLETED", completedAt: new Date(now.getTime() - 2 * DAY) } });
  await log(ev.id, alya.id, "EVENT_JOINED", "PARTICIPANT", { source: "discover" });
  for (const [act, st, xp] of [[aMenara, sMenara, 100], [aRasa, sRasa, 150], [aSandi, sCerdas, 80], [aPanggung, sHarmoni, 120], [aHarapan, sCerita, 50]] as const) {
    const c = await prisma.activityCompletion.create({
      data: { activityId: act.id, eventId: ev.id, userId: alya.id, method: act.id === aSandi.id || act.id === aHarapan.id ? "AUTO" : "QR_VERIFY", idempotencyKey: `demo:alya:${act.id}`, dataJson: {} },
    });
    await prisma.participantStamp.create({ data: { userId: alya.id, stampId: st.id, eventId: ev.id, completionId: c.id, idempotencyKey: `demo:alya:stamp:${st.id}` } });
    await prisma.xpTransaction.create({ data: { userId: alya.id, eventId: ev.id, amount: xp, reason: `Aktivitas: ${act.title}`, idempotencyKey: `demo:alya:xp:${act.id}` } });
    await log(ev.id, alya.id, "ACTIVITY_COMPLETED", "PARTICIPANT", { activityId: act.id });
    await log(ev.id, alya.id, "STAMP_AWARDED", "SYSTEM", { stampId: st.id });
    await log(ev.id, alya.id, "XP_AWARDED", "SYSTEM", { amount: xp });
  }
  await prisma.participantAchievement.createMany({
    data: [
      { userId: alya.id, achievementId: aLangkah.id, eventId: ev.id, idempotencyKey: `demo:alya:ach:${aLangkah.id}` },
      { userId: alya.id, achievementId: achRasa.id, eventId: ev.id, idempotencyKey: `demo:alya:ach:${achRasa.id}` },
      { userId: alya.id, achievementId: aMalam.id, eventId: ev.id, idempotencyKey: `demo:alya:ach:${aMalam.id}` },
    ],
  });
  await log(ev.id, alya.id, "ACHIEVEMENT_UNLOCKED", "SYSTEM", { achievementId: aMalam.id });
  const alyaResp = await prisma.feedbackResponse.create({
    data: { formId: form.id, userId: alya.id, eventId: ev.id, idempotencyKey: `demo:alya:feedback` },
  });
  await prisma.feedbackAnswer.createMany({
    data: [
      { responseId: alyaResp.id, questionId: qs[0].id, value: "5" },
      { responseId: alyaResp.id, questionId: qs[1].id, value: "5" },
      { responseId: alyaResp.id, questionId: qs[2].id, value: "Semuanya seru, stempelnya bikin nagih!" },
      { responseId: alyaResp.id, questionId: qs[3].id, value: "Sangat mungkin" },
    ],
  });
  await log(ev.id, alya.id, "FEEDBACK_SUBMITTED", "PARTICIPANT", { score: 5 });
  const alyaIssuance = await prisma.credentialIssuance.create({
    data: { credentialConfigId: credConfig.id, userId: alya.id, eventId: ev.id, status: "ISSUED", providerReference: "did:idchain:vc:demo:alya-001", idempotencyKey: `demo:alya:cred` },
  });
  await prisma.credentialEvent.create({ data: { issuanceId: alyaIssuance.id, type: "ISSUED", payload: { providerReference: "did:idchain:vc:demo:alya-001" } } });
  await log(ev.id, alya.id, "CREDENTIAL_ELIGIBLE", "SYSTEM", { configId: credConfig.id });
  await log(ev.id, alya.id, "CREDENTIAL_ISSUED", "SYSTEM", { issuanceId: alyaIssuance.id });

  // Dimas — gabung tapi belum mulai (drop-off awal)
  await prisma.eventParticipant.create({ data: { eventId: ev.id, userId: dimas.id } });
  await log(ev.id, dimas.id, "EVENT_JOINED", "PARTICIPANT", { source: "discover" });
  await prisma.eventParticipant.create({ data: { eventId: evSeni.id, userId: dimas.id } });
  await log(evSeni.id, dimas.id, "EVENT_JOINED", "PARTICIPANT", { source: "recommendation" });
  await prisma.eventParticipant.create({ data: { eventId: evKuliner.id, userId: dimas.id } });
  await log(evKuliner.id, dimas.id, "EVENT_JOINED", "PARTICIPANT", { source: "discover" });

  // Partisipasi di event lain (riwayat untuk rekomendasi)
  await prisma.eventParticipant.create({ data: { eventId: evSeni.id, userId: alya.id } });
  await log(evSeni.id, alya.id, "EVENT_JOINED", "PARTICIPANT", { source: "discover" });
  await prisma.eventParticipant.create({ data: { eventId: evMusik.id, userId: alya.id } });
  await log(evMusik.id, alya.id, "EVENT_JOINED", "PARTICIPANT", { source: "recommendation" });
  await prisma.eventParticipant.create({ data: { eventId: evSeni.id, userId: sari.id } });
  await log(evSeni.id, sari.id, "EVENT_JOINED", "PARTICIPANT", { source: "discover" });
  await prisma.eventParticipant.create({ data: { eventId: evKuliner.id, userId: sari.id } });
  await log(evKuliner.id, sari.id, "EVENT_JOINED", "PARTICIPANT", { source: "discover" });
  await prisma.eventParticipant.create({ data: { eventId: evMusik.id, userId: budi.id } });
  await log(evMusik.id, budi.id, "EVENT_JOINED", "PARTICIPANT", { source: "discover" });

  // ---------- Scanner device (demo) ----------
  await prisma.scannerDevice.create({
    data: { eventId: ev.id, name: "Scanner Gerbang Utara", deviceCode: "SCAN-SEMILIR-01", authorizedByUserId: rara.id, authorizedAt: new Date() },
  });

  console.log("✓ seed selesai");
  console.log("  Event utama : Jelajah Kota Tua (/events/jelajah-kota-tua)");
  console.log("  Peserta demo : Putri Anggraini — login demo participant");
  console.log("  Organizer demo: Rara Semilir — login demo organizer");
  console.log(`  RULES drop=${RULE_DROP.slice(0, 6)} feed=${RULE_FEED.slice(0, 6)} verify=${RULE_VERIFY.slice(0, 6)}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
