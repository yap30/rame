// ============================================================
// RAME — UI store (zustand): bahasa + aksesibilitas + identitas event
// ============================================================
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Lang } from "./i18n";

export interface EventIdentity {
  eventShortName?: string;
  logoEmoji?: string;
  brand?: string;
  brandSoft?: string;
  brandInk?: string;
  accent?: string;
  accentSoft?: string;
  gold?: string;
  ink?: string;
  paper?: string;
}

interface UiState {
  lang: Lang;
  setLang: (lang: Lang) => void;
  identity: EventIdentity | null;
  setIdentity: (identity: EventIdentity | null) => void;
  // peran aktif (pilihan di dropdown profile) — menentukan menu & halaman yang ditampilkan
  view: "participant" | "organizer" | "admin";
  setView: (view: UiState["view"]) => void;
  // aksesibilitas
  fontSize: 0 | 1 | 2 | 3; // A / A+ / A++ / A+++
  highContrast: boolean;
  wideSpacing: boolean;
  setFontSize: (s: 0 | 1 | 2 | 3) => void;
  toggleContrast: () => void;
  toggleSpacing: () => void;
  resetA11y: () => void;
}

const DEFAULT_IDENTITY: EventIdentity = {
  brand: "#1e3a34",
  brandSoft: "#e4ece5",
  brandInk: "#ffffff",
  accent: "#d97706",
  accentSoft: "#fdf0dc",
  gold: "#b98a1a",
  ink: "#22302c",
  paper: "#f8f4ea",
};

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      lang: "id",
      setLang: (lang) => set({ lang }),
      identity: null,
      setIdentity: (identity) => set({ identity: identity ?? DEFAULT_IDENTITY }),
      view: "participant",
      setView: (view) => set({ view }),
      fontSize: 0,
      highContrast: false,
      wideSpacing: false,
      setFontSize: (fontSize) => set({ fontSize }),
      toggleContrast: () => set((s) => ({ highContrast: !s.highContrast })),
      toggleSpacing: () => set((s) => ({ wideSpacing: !s.wideSpacing })),
      resetA11y: () => set({ fontSize: 0, highContrast: false, wideSpacing: false }),
    }),
    { name: "rame-ui" },
  ),
);

/** Terapkan identitas + aksesibilitas ke elemen <html> */
export function applyUi(identity: EventIdentity | null, fontSize: number, highContrast: boolean, wideSpacing: boolean) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const id = identity ?? DEFAULT_IDENTITY;
  const setVar = (name: string, hex?: string) => {
    if (!hex) return;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    root.style.setProperty(name, `${r} ${g} ${b}`);
  };
  setVar("--rame-brand", id.brand);
  setVar("--rame-brand-soft", id.brandSoft);
  setVar("--rame-brand-ink", id.brandInk);
  setVar("--rame-accent", id.accent);
  setVar("--rame-accent-soft", id.accentSoft);
  setVar("--rame-gold", id.gold);
  setVar("--rame-ink", id.ink);
  setVar("--rame-paper", id.paper);

  const scales = [1, 1.1, 1.2, 1.35];
  root.style.setProperty("--a11y-scale", String(scales[fontSize] ?? 1));
  root.style.setProperty("--a11y-line", wideSpacing ? "1.9" : "1.6");
  root.classList.toggle("rame-contrast", highContrast);
}
