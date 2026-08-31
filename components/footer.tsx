"use client";

import Link from "next/link";
import { useUiStore } from "@/lib/ui-store";
import { useT } from "@/lib/client";
import { eidStatusClient } from "@/lib/client-env";

export function Footer() {
  const t = useT();
  const identity = useUiStore((s) => s.identity);
  const brand = identity?.brand ?? "#1e3a34";
  const eid = eidStatusClient();

  return (
    <footer className="mt-16 border-t border-ink/10" style={{ background: "rgb(var(--rame-brand-soft) / 0.5)" }}>
      <div className="rame-container grid gap-8 py-10 sm:grid-cols-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg text-base font-bold" style={{ background: brand, color: "#fff" }}>
              {identity?.logoEmoji ?? "◆"}
            </span>
            <span className="font-display text-lg font-bold" style={{ color: brand }}>
              {identity?.eventShortName ?? "RAME"}
            </span>
          </div>
          <p className="mt-3 max-w-xs text-sm text-ink/60">{t("common.tagline")}</p>
        </div>
        <div>
          <div className="mb-3 text-xs font-bold uppercase tracking-widest text-ink/50">{t("nav.events")}</div>
          <ul className="space-y-2 text-sm text-ink/70">
            <li><Link className="hover:text-brand" href="/events">{t("home.exploreEvents")}</Link></li>
            <li><Link className="hover:text-brand" href="/organizer">{t("nav.organizer")}</Link></li>
            <li><Link className="hover:text-brand" href="/join">{t("common.login")}</Link></li>
            <li className="pt-2 text-xs text-ink/50">
              <Link className="hover:text-brand" href="/terms">Syarat & Ketentuan</Link> ·{" "}
              <Link className="hover:text-brand" href="/privacy">Privasi</Link>
            </li>
          </ul>
        </div>
        <div>
          <div className="mb-3 text-xs font-bold uppercase tracking-widest text-ink/50">Identitas</div>
          <div className="flex flex-wrap gap-2">
            <span className="chip">e.id OAuth SSO</span>
            <span className="chip">e.id Issuer</span>
            <span className="chip">Verifiable Credential</span>
            <span className="chip">{eid.real ? eid.label : "Mode Demo"}</span>
          </div>
          <p className="mt-3 text-xs text-ink/50">
            RAME · Technical Specification & Prototype Blueprint v1.0 · 2026
          </p>
        </div>
      </div>
    </footer>
  );
}
