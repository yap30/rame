"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { BarChart3, History, LayoutDashboard, Lightbulb, Map, QrCode, ScanLine, Settings, Sparkles, StampIcon, Trophy } from "lucide-react";
import { api, useT } from "@/lib/client";
import { Button, Spinner } from "@/components/ui";

interface Me {
  user: { id: string; name: string; role: string } | null;
}

export default function OrganizerLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id?: string }> }) {
  const t = useT();
  const pathname = usePathname();
  const router = useRouter();
  const qc = useQueryClient();
  const [ensureError, setEnsureError] = useState<string | null>(null);
  const attempted = useRef(false);

  const { data, isLoading } = useQuery({ queryKey: ["me"], queryFn: () => api<Me>("/api/auth/me") });

  // pilih "Buat Event" dari menu = aktifkan mode penyelenggara (tanpa pemetaan role saat daftar)
  const ensure = useMutation({
    mutationFn: () => api("/api/organizer/ensure", { method: "POST" }),
    onSuccess: async () => {
      await qc.refetchQueries({ queryKey: ["me"] });
      router.refresh();
    },
    onError: (err) => setEnsureError((err as Error)?.message ?? "Gagal menyiapkan akun penyelenggara."),
  });

  useEffect(() => {
    if (isLoading) return;
    if (!data?.user) {
      router.push("/join?next=/organizer");
      return;
    }
    if (data.user.role !== "ORGANIZER" && !ensure.isPending && !attempted.current) {
      attempted.current = true;
      setEnsureError(null);
      ensure.mutate();
    }
  }, [data, isLoading, router, ensure]);

  if (isLoading || !data?.user) {
    return <div className="rame-container flex justify-center py-24"><Spinner className="h-8 w-8" /></div>;
  }
  if (data.user.role !== "ORGANIZER") {
    if (ensure.isPending) {
      // sedang menyiapkan akun penyelenggara (ensure berjalan)
      return (
        <div className="rame-container flex max-w-md flex-col items-center gap-3 py-24 text-center">
          <Spinner className="h-8 w-8" />
          <div className="text-sm font-semibold text-ink/60">{t("org.ensuring")}</div>
        </div>
      );
    }
    // gagal — tampilkan pesan + tombol coba lagi (jangan spinner selamanya)
    return (
      <div className="rame-container flex max-w-md flex-col items-center gap-3 py-24 text-center">
        <div className="text-4xl">⚠️</div>
        <div className="text-sm font-semibold text-ink/60">{ensureError ?? "Gagal menyiapkan akun penyelenggara."}</div>
        <Button
          onClick={() => {
            attempted.current = false;
            setEnsureError(null);
            ensure.mutate();
          }}
        >
          Coba lagi
        </Button>
      </div>
    );
  }

  // tabs event (jika di dalam /organizer/events/[id])
  const eventIdMatch = pathname.match(/^\/organizer\/events\/([^/]+)/);
  const eventId = eventIdMatch?.[1];

  const items = [
    { href: "/organizer", label: t("org.dashboard"), icon: LayoutDashboard },
    { href: "/organizer/events/new", label: t("org.newEvent"), icon: Sparkles },
  ];
  const eventTabs = eventId
    ? [
        { href: `/organizer/events/${eventId}`, label: t("org.setup"), icon: Settings },
        { href: `/organizer/events/${eventId}/journey`, label: t("org.journeyBuilder"), icon: Map },
        { href: `/organizer/events/${eventId}/activities`, label: t("org.activityBuilder"), icon: StampIcon },
        { href: `/organizer/events/${eventId}/credential`, label: t("nav.credential"), icon: Trophy },
        { href: `/organizer/events/${eventId}/scanner`, label: t("org.scanner"), icon: QrCode },
        { href: `/organizer/events/${eventId}/scan`, label: t("scanner.title"), icon: ScanLine },
        { href: `/organizer/events/${eventId}/analytics`, label: t("org.analytics"), icon: BarChart3 },
        { href: `/organizer/events/${eventId}/insights`, label: t("org.insights"), icon: Lightbulb },
        { href: `/organizer/events/${eventId}/replay`, label: t("org.replay"), icon: History },
      ]
    : [];

  return (
    <div className="mx-auto flex w-full max-w-7xl gap-6 px-4 py-8 sm:px-6">
      <aside className="hidden w-56 shrink-0 md:block">
        <div className="sticky top-20 space-y-1">
          <div className="mb-3 px-3 text-[10px] font-black uppercase tracking-widest text-ink/40">{data.user.name.split(" ")[0]} · {t("nav.organizer")}</div>
          {items.map((it) => (
            <SideLink key={it.href} href={it.href} active={pathname === it.href} icon={<it.icon className="h-4 w-4" />} label={it.label} />
          ))}
          {eventTabs.length > 0 && (
            <>
              <div className="mb-1 mt-5 px-3 text-[10px] font-black uppercase tracking-widest text-ink/40">Event</div>
              {eventTabs.map((it) => (
                <SideLink key={it.href} href={it.href} active={pathname === it.href} icon={<it.icon className="h-4 w-4" />} label={it.label} />
              ))}
            </>
          )}
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {/* tab bar mobile */}
        {eventTabs.length > 0 && (
          <div className="mb-6 flex gap-1.5 overflow-x-auto pb-1 md:hidden">
            {eventTabs.map((it) => (
              <Link
                key={it.href}
                href={it.href}
                className={`whitespace-nowrap rounded-full border px-3.5 py-1.5 text-xs font-semibold ${
                  pathname === it.href ? "border-brand bg-brand text-brand-ink" : "border-ink/15 text-ink/60"
                }`}
              >
                {it.label}
              </Link>
            ))}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

function SideLink({ href, active, icon, label }: { href: string; active: boolean; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold transition ${
        active ? "bg-brand text-brand-ink shadow-lift" : "text-ink/65 hover:bg-ink/5"
      }`}
    >
      {icon} {label}
    </Link>
  );
}
