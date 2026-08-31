import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Syarat & Ketentuan" };

export default function TermsPage() {
  return (
    <div className="rame-container max-w-2xl py-12">
      <div className="section-kicker">Legal</div>
      <h1 className="section-title mb-6">Syarat & Ketentuan / Terms of Service</h1>

      <div className="space-y-6 text-sm leading-relaxed text-ink/75">
        <Section title="1. Platform">
          <p><strong>Bahasa Indonesia:</strong> RAME adalah platform white-label untuk event komunitas. Penyelenggara (EO) menetapkan aturan event, journey, reward, verifikasi, dan kebijakan kredensialnya sendiri. Dengan menggunakan RAME, Anda menyetujui syarat berikut.</p>
          <p className="mt-2"><strong>English:</strong> RAME is a white-label platform for community events. Organizers (EO) set their own event rules, journeys, rewards, verification, and credential policies. By using RAME you agree to these terms.</p>
        </Section>
        <Section title="2. Identitas & e.id">
          <p>Identitas peserta terhubung melalui <strong>e.id (IDChain)</strong> OAuth SSO. RAME hanya menyimpan referensi identitas (DID) dan data yang diperlukan fungsi produk (data minimization). Provider tokens dan client secrets tidak pernah terekspos ke browser.</p>
        </Section>
        <Section title="3. Reward & Kredensial">
          <p>Reward (XP, stempel, pencapaian) diberikan secara otomatis sesuai konfigurasi EO dan bersifat idempoten. Kredensial diterbitkan atas nama EO melalui e.id Issuer; status: ELIGIBLE → PENDING → ISSUED/FAILED → REVOKED. Kelayakan ditentukan kebijakan event.</p>
        </Section>
        <Section title="4. Tanggung Jawab">
          <p>RAME menyediakan infrastruktur; konten event (cerita, aktivitas, reward) adalah tanggung jawab EO. Verifikasi QR bersifat anti-fraud (TTL singkat, nonce sekali pakai, otorisasi perangkat) namun tidak menjamin kehadiran fisik mutlak.</p>
        </Section>
        <Section title="5. Non-MVP">
          <p>Tiket dan pembayaran berada di luar lingkup MVP. Insight otomatis berbasis aturan deterministik — tanpa AI generatif.</p>
        </Section>
      </div>

      <div className="mt-8 text-xs text-ink/50">
        RAME Technical Specification & Prototype Blueprint v1.0 · 30 Agustus 2026 ·{" "}
        <Link href="/privacy" className="underline">Kebijakan Privasi</Link>
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
