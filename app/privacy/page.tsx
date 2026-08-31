import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Kebijakan Privasi" };

export default function PrivacyPage() {
  return (
    <div className="rame-container max-w-2xl py-12">
      <div className="section-kicker">Legal</div>
      <h1 className="section-title mb-6">Kebijakan Privasi / Privacy Policy</h1>

      <div className="space-y-6 text-sm leading-relaxed text-ink/75">
        <Section title="1. Data yang Dikumpulkan">
          <ul className="list-disc space-y-1 pl-5">
            <li><strong>Identitas:</strong> referensi e.id (DID), nama, email — hanya bila Anda masuk dengan e.id.</li>
            <li><strong>Partisipasi:</strong> event yang diikuti, aktivitas diselesaikan, stempel/XP/achievement, umpan balik, status kredensial.</li>
            <li><strong>Teknis:</strong> log event anonim untuk analitik EO (tanpa PII bila GA4 diaktifkan, `anonymize_ip`).</li>
          </ul>
        </Section>
        <Section title="2. Prinsip">
          <ul className="list-disc space-y-1 pl-5">
            <li><strong>Data minimization</strong> — hanya data yang dibutuhkan fungsi produk.</li>
            <li><strong>Consent + least privilege</strong> — data peserta tidak masuk scope partner kecuali diotorisasi.</li>
            <li><strong>Server-side enforcement</strong> — scope organisasi & event selalu diverifikasi di server (RBAC).</li>
          </ul>
        </Section>
        <Section title="3. e.id & Kredensial">
          <p>Autentikasi dilakukan e.id (OAuth SSO). Kredensial verifiable diterbitkan via e.id Issuer atas nama EO; RAME hanya menyimpan referensi penerbitan dan status — bukan duplikasi data provider (blueprint §4).</p>
        </Section>
        <Section title="4. Cookies & Sesi">
          <p>Satu cookie sesi httpOnly (`rame_session`, JWT) untuk menjaga login. Preferensi UI (bahasa, aksesibilitas) disimpan di localStorage perangkat Anda. Anti-fraud QR menggunakan sesi singkat server-side.</p>
        </Section>
        <Section title="5. Hak Anda">
          <p>Anda dapat keluar dan menghentikan penggunaan kapan saja. Untuk permintaan penghapusan data atau pertanyaan privasi, hubungi penyelenggara event terkait atau tim RAME.</p>
        </Section>
      </div>

      <div className="mt-8 text-xs text-ink/50">
        RAME Technical Specification & Prototype Blueprint v1.0 · 30 Agustus 2026 ·{" "}
        <Link href="/terms" className="underline">Syarat & Ketentuan</Link>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 font-display text-lg font-bold text-brand">{title}</h2>
      {children}
    </section>
  );
}
