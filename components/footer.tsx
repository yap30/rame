"use client";

import Link from "next/link";
import { useUiStore } from "@/lib/ui-store";
import { useT } from "@/lib/client";

export function Footer() {
  const t = useT();
  const identity = useUiStore((s) => s.identity);
  const brand = identity?.brand ?? "#1e3a34";

  return (
    <footer className="mt-16 border-t border-ink/10" style={{ background: "rgb(var(--rame-brand-soft) / 0.5)" }}>
      <div className="rame-container grid gap-8 py-10 sm:grid-cols-3">
        <div>
          <div className="flex items-center gap-2">
            {identity?.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={identity.logoUrl} alt="" className="h-8 w-8 rounded-lg border border-ink/10 object-cover" />
            ) : (
              <span className="flex h-8 w-8 items-center justify-center rounded-lg text-base font-bold" style={{ background: brand, color: "#fff" }}>
                {identity?.logoEmoji ?? "◆"}
              </span>
            )}
            <span className="font-display text-lg font-bold" style={{ color: brand }}>
              {identity?.eventShortName ?? "RAME"}
            </span>
          </div>
          <p className="mt-3 max-w-xs text-sm text-ink/60">{t("common.tagline")}</p>
        </div>
        <div>
          <div className="mb-3 text-xs font-bold uppercase tracking-widest text-ink/50">{t("nav.events")}</div>
          <ul className="space-y-2 text-sm text-ink/70">
            <li><Link className="hover:text-brand" href="/organizer">{t("nav.organizer")}</Link></li>
            <li className="pt-2 text-xs text-ink/50">
              <Link className="hover:text-brand" href="/terms">Syarat & Ketentuan</Link> ·{" "}
              <Link className="hover:text-brand" href="/privacy">Privasi</Link>
            </li>
          </ul>
        </div>
        <div className="text-sm text-ink/50">
          © {new Date().getFullYear()} RAME
        </div>
      </div>
    </footer>
  );
}
