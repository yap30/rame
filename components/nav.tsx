"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Languages, LayoutDashboard, LogOut, Menu, Shield, Sparkles, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useUiStore } from "@/lib/ui-store";
import { api, useT } from "@/lib/client";

interface Me {
  user: {
    id: string;
    name: string;
    email?: string | null;
    role: string;
    orgId?: string | null;
    eid?: { subject: string; trustLevel?: string | null } | null;
  } | null;
  eid: { mode: string; label: string; real: boolean };
}

export function Nav() {
  const t = useT();
  const pathname = usePathname();
  const router = useRouter();
  const qc = useQueryClient();
  const lang = useUiStore((s) => s.lang);
  const setLang = useUiStore((s) => s.setLang);
  const identity = useUiStore((s) => s.identity);
  const [me, setMe] = useState<Me | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    api<Me>("/api/auth/me").then(setMe).catch(() => setMe(null));
  }, [pathname]);

  const brand = identity?.brand ?? "#1e3a34";
  const brandInk = identity?.brandInk ?? "#ffffff";
  const emoji = identity?.logoEmoji ?? "◆";

  const links = [
    { href: "/", label: t("nav.home") },
    { href: "/events", label: t("nav.events") },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-ink/10 backdrop-blur-md" style={{ background: "rgb(var(--rame-paper) / 0.85)" }}>
      <div className="rame-container flex h-16 items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2.5">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-xl text-lg font-bold shadow-lift"
            style={{ background: brand, color: brandInk }}
          >
            {emoji}
          </span>
          <span className="font-display text-xl font-bold tracking-tight" style={{ color: brand }}>
            {identity?.eventShortName ?? "RAME"}
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-full px-4 py-2 text-sm font-medium transition hover:bg-ink/5 ${pathname === l.href ? "bg-ink/8 text-brand" : "text-ink/70"}`}
            >
              {l.label}
            </Link>
          ))}
          {me?.user?.role === "PARTICIPANT" ? (
            <Link
              href="/dashboard"
              className={`rounded-full px-4 py-2 text-sm font-medium transition hover:bg-ink/5 ${pathname.startsWith("/dashboard") ? "bg-ink/8 text-brand" : "text-ink/70"}`}
            >
              Dashboard
            </Link>
          ) : !me?.user ? (
            <Link href="/register" className="rounded-full px-4 py-2 text-sm font-medium text-ink/70 transition hover:bg-ink/5">
              Daftar
            </Link>
          ) : null}
          {me?.user?.role === "ORGANIZER" && (
            <Link
              href="/organizer"
              className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition hover:bg-ink/5 ${pathname.startsWith("/organizer") ? "bg-ink/8 text-brand" : "text-ink/70"}`}
            >
              <LayoutDashboard className="h-4 w-4" /> {t("nav.organizer")}
            </Link>
          )}
          {me?.user?.role === "ADMIN" && (
            <Link
              href="/admin"
              className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition hover:bg-ink/5 ${pathname.startsWith("/admin") ? "bg-ink/8 text-brand" : "text-ink/70"}`}
            >
              <Shield className="h-4 w-4" /> Admin
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setLang(lang === "id" ? "en" : "id")}
            className="btn-ghost !px-3 !py-1.5 text-xs font-bold"
            aria-label="Ganti bahasa"
            title="Toggle language"
          >
            <Languages className="h-4 w-4" />
            {t("common.langToggle")}
          </button>

          {me?.user ? (
            <Link href="/profile" className="hidden items-center gap-2 rounded-full border border-ink/15 py-1 pl-1 pr-3 hover:bg-ink/5 sm:flex">
              <span className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold" style={{ background: brand, color: brandInk }}>
                {me.user.name.charAt(0)}
              </span>
              <span className="text-sm font-semibold">{me.user.name.split(" ")[0]}</span>
            </Link>
          ) : (
            <Link href="/join" className="btn-primary !px-4 !py-2 text-xs">
              {t("common.login")}
            </Link>
          )}

          <button className="btn-ghost !px-2.5 md:hidden" onClick={() => setOpen(!open)} aria-label="Menu">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-ink/10 px-4 py-3 md:hidden">
          <div className="flex flex-col gap-1">
            {links.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm hover:bg-ink/5">
                {l.label}
              </Link>
            ))}
            {me?.user?.role === "PARTICIPANT" ? (
              <Link href="/dashboard" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm hover:bg-ink/5">
                Dashboard
              </Link>
            ) : !me?.user ? (
              <Link href="/register" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm hover:bg-ink/5">
                Daftar
              </Link>
            ) : null}
            {me?.user?.role === "ORGANIZER" && (
              <Link href="/organizer" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm hover:bg-ink/5">
                {t("nav.organizer")}
              </Link>
            )}
            {me?.user?.role === "ADMIN" && (
              <Link href="/admin" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm hover:bg-ink/5">
                Admin
              </Link>
            )}
            {me?.user && (
              <button
                onClick={async () => {
                  await fetch("/api/auth/logout", { method: "POST" });
                  qc.clear(); // buang cache personal agar tidak bocor ke user lain
                  setMe(null);
                  setOpen(false);
                  router.push("/");
                  router.refresh();
                }}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" /> {t("common.logout")}
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
