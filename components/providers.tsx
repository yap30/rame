// ============================================================
// RAME — provider klien: React Query + sinkronisasi tema/i18n
// ============================================================
"use client";

import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useA11y } from "@/lib/client";

/**
 * Menjaga cache React Query tetap konsisten dengan identitas login.
 * Cache berisi data personal (stamps, progres, myStatus) yang key-nya TIDAK
 * memuat userId — jadi saat user berubah/logout, cache harus dibuang agar
 * data pengguna sebelumnya tidak bocor ke pengguna lain.
 * Dipicu: setiap navigasi (pathname), dan event "rame:auth-changed"
 * (login/logout/401 sesi kedaluwarsa).
 */
function AuthSync() {
  const qc = useQueryClient();
  const pathname = usePathname();
  const uidRef = useRef<string | null | undefined>(undefined); // undefined = belum dicek

  useEffect(() => {
    let alive = true;
    const check = async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        const body = (await res.json().catch(() => ({}))) as { user?: { id?: string } | null };
        const next = body.user?.id ?? null;
        if (!alive) return;
        if (uidRef.current !== undefined && uidRef.current !== next) {
          // identitas berubah: logout / ganti user / sesi kedaluwarsa → buang cache personal
          qc.clear();
        }
        uidRef.current = next;
      } catch {
        // jaringan — biarkan check berikutnya
      }
    };
    check();
    const onAuthEvent = () => {
      check();
    };
    window.addEventListener("rame:auth-changed", onAuthEvent);
    return () => {
      alive = false;
      window.removeEventListener("rame:auth-changed", onAuthEvent);
    };
  }, [pathname, qc]);

  return null;
}

function ThemeSync() {
  useA11y();
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 15_000 },
        },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <AuthSync />
      <ThemeSync />
      {children}
    </QueryClientProvider>
  );
}
