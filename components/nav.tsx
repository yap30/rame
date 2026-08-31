"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Languages, LayoutDashboard, LogOut, Menu, Shield, ChevronDown, X } from "lucide-react";
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
  const setIdentity = useUiStore((s) => s.setIdentity);
  const view = useUiStore((s) => s.view);
  const setView = useUiStore((s) => s.setView);
  const [me, setMe] = useState<Me | null>(null);
  const [open, setOpen] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);

  useEffect(() => {
    api<Me>("/api/auth/me").then(setMe).catch(() => setMe(null));
  }, [pathname]);

  // identitas event hanya berlaku di halaman event/aktivitas — di luar itu
  // tampilkan identitas platform (RAME), jangan event demo yang tersimpan.
  const isEventContext = pathname.startsWith("/events/") || pathname.startsWith("/activities/");
  useEffect(() => {
    if (!isEventContext) setIdentity(null);
  }, [pathname, isEventContext, setIdentity]);

  // peran aktif menentukan menu & halaman — validasi terhadap peran sebenarnya di server
  const role = me?.user?.role ?? null;
  const effectiveView: "participant" | "organizer" | "admin" =
    view === "admin"
      ? role === "ADMIN"
        ? "admin"
        : role === "ORGANIZER"
          ? "organizer"
          : "participant"
      : view === "organizer" && (role === "ORGANIZER" || role === "ADMIN")
        ? "organizer"
        : "participant";

  const brand = identity?.brand ?? "#1e3a34";
  const brandInk = identity?.brandInk ?? "#ffffff";
  const emoji = identity?.logoEmoji ?? "◆";

  // pilih peran langsung dari nav (sama seperti di profile)
  const roleLabel = effectiveView === "organizer" ? t("role.organizer") : effectiveView === "admin" ? t("role.admin") : t("role.participant");
  const pickRole = async (v: "participant" | "organizer" | "admin") => {
    if (v === "organizer" && role !== "ORGANIZER" && role !== "ADMIN") {
      try {
        await api("/api/organizer/ensure", { method: "POST" });
        qc.invalidateQueries({ queryKey: ["me"] });
      } catch {
        // gagal memastikan — tetap pindah tampilan
      }
    }
    setView(v);
    setRoleOpen(false);
    setOpen(false);
    router.refresh();
  };

  // sebelum login, daftar event sudah tersedia di beranda — sembunyikan menu Event
  const links = me?.user
    ? [
        { href: "/", label: t("nav.home") },
        { href: "/events", label: t("nav.events") },
      ]
    : [{ href: "/", label: t("nav.home") }];

  return (
    <header className="sticky top-0 z-40 border-b border-ink/10 backdrop-blur-md" style={{ background: "rgb(var(--rame-paper) / 0.85)" }}>
      <div className="rame-container flex h-16 items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2.5">
          {identity?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={identity.logoUrl} alt="" className="h-9 w-9 rounded-xl border border-ink/10 object-cover" />
          ) : (
            <span
              className="flex h-9 w-9 items-center justify-center rounded-xl text-lg font-bold shadow-lift"
              style={{ background: brand, color: brandInk }}
            >
              {emoji}
            </span>
          )}
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
          {me?.user ? (
            <>
              {effectiveView === "participant" && (
                <Link
                  href="/dashboard"
                  className={`rounded-full px-4 py-2 text-sm font-medium transition hover:bg-ink/5 ${pathname.startsWith("/dashboard") ? "bg-ink/8 text-brand" : "text-ink/70"}`}
                >
                  {t("nav.dashboard")}
                </Link>
              )}
              {effectiveView === "organizer" && (
                <Link
                  href="/organizer"
                  className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition hover:bg-ink/5 ${pathname.startsWith("/organizer") ? "bg-ink/8 text-brand" : "text-ink/70"}`}
                >
                  <LayoutDashboard className="h-4 w-4" /> {t("nav.organizer")}
                </Link>
              )}
              {effectiveView === "admin" && (
                <Link
                  href="/admin"
                  className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition hover:bg-ink/5 ${pathname.startsWith("/admin") ? "bg-ink/8 text-brand" : "text-ink/70"}`}
                >
                  <Shield className="h-4 w-4" /> Admin
                </Link>
              )}
            </>
          ) : null}
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
            <>
              {/* pemilih peran (desktop) */}
              <div className="relative hidden sm:block">
                <button
                  onClick={() => setRoleOpen((o) => !o)}
                  className="btn-ghost !px-3 !py-1.5 text-xs font-bold"
                  aria-label="Pilih peran"
                >
                  {roleLabel} <ChevronDown className="h-3.5 w-3.5" />
                </button>
                {roleOpen && (
                  <div className="absolute right-0 z-50 mt-2 w-48 overflow-hidden rounded-xl border border-ink/10 bg-white shadow-lift">
                    <button onClick={() => pickRole("participant")} className={`block w-full px-4 py-2.5 text-left text-sm font-semibold hover:bg-ink/5 ${effectiveView === "participant" ? "bg-brand/10 text-brand" : ""}`}>
                      🧑 {t("role.participant")}
                    </button>
                    <button onClick={() => pickRole("organizer")} className={`block w-full px-4 py-2.5 text-left text-sm font-semibold hover:bg-ink/5 ${effectiveView === "organizer" ? "bg-brand/10 text-brand" : ""}`}>
                      🏢 {t("role.organizer")}
                    </button>
                    <button
                      onClick={() => pickRole("admin")}
                      disabled={role !== "ADMIN"}
                      title={role !== "ADMIN" ? "Khusus role Admin" : undefined}
                      className={`block w-full px-4 py-2.5 text-left text-sm font-semibold hover:bg-ink/5 ${effectiveView === "admin" ? "bg-brand/10 text-brand" : ""} ${role !== "ADMIN" ? "cursor-not-allowed opacity-40" : ""}`}
                    >
                      🛡️ {t("role.admin")}
                    </button>
                  </div>
                )}
              </div>
              <Link href="/profile" className="hidden items-center gap-2 rounded-full border border-ink/15 py-1 pl-1 pr-3 hover:bg-ink/5 sm:flex">
                <span className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold" style={{ background: brand, color: brandInk }}>
                  {me.user.name.charAt(0)}
                </span>
                <span className="text-sm font-semibold">{me.user.name.split(" ")[0]}</span>
              </Link>
            </>
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
            {me?.user ? (
              <>
                {effectiveView === "participant" && (
                  <Link href="/dashboard" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm hover:bg-ink/5">
                    {t("nav.dashboard")}
                  </Link>
                )}
                {effectiveView === "organizer" && (
                  <Link href="/organizer" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm hover:bg-ink/5">
                    {t("nav.organizer")}
                  </Link>
                )}
                {effectiveView === "admin" && (
                  <Link href="/admin" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm hover:bg-ink/5">
                    Admin
                  </Link>
                )}
                {/* pemilih peran (HP) — sama dengan dropdown desktop */}
                <div className="border-t border-ink/10 px-3 pb-1 pt-3">
                  <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-ink/40">{t("profile.role")}</div>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button onClick={() => pickRole("participant")} className={`rounded-lg border px-2 py-2 text-xs font-bold ${effectiveView === "participant" ? "border-brand bg-brand/10 text-brand" : "border-ink/15"}`}>
                      🧑 {t("role.participant")}
                    </button>
                    <button onClick={() => pickRole("organizer")} className={`rounded-lg border px-2 py-2 text-xs font-bold ${effectiveView === "organizer" ? "border-brand bg-brand/10 text-brand" : "border-ink/15"}`}>
                      🏢 {t("role.organizer")}
                    </button>
                    <button
                      onClick={() => pickRole("admin")}
                      disabled={role !== "ADMIN"}
                      className={`rounded-lg border px-2 py-2 text-xs font-bold ${effectiveView === "admin" ? "border-brand bg-brand/10 text-brand" : "border-ink/15"} ${role !== "ADMIN" ? "cursor-not-allowed opacity-40" : ""}`}
                    >
                      🛡️ {t("role.admin")}
                    </button>
                  </div>
                </div>
                <Link href="/profile" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-ink/5">
                  👤 {me.user.name}
                </Link>
              </>
            ) : (
              <Link href="/join" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm hover:bg-ink/5">
                {t("common.login")}
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
