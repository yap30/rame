// ============================================================
// RAME — toolbar aksesibilitas (pola halobadung.id)
// Ukuran huruf, kontras tinggi, jarak baris, reset.
// ============================================================
"use client";

import { Accessibility, Highlighter, Rows3, RotateCcw, Type } from "lucide-react";
import { useState } from "react";
import { useUiStore } from "@/lib/ui-store";
import { useT } from "@/lib/client";

const SIZES = ["A", "A+", "A++", "A+++"] as const;

export function AccessibilityToolbar() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const fontSize = useUiStore((s) => s.fontSize);
  const setFontSize = useUiStore((s) => s.setFontSize);
  const highContrast = useUiStore((s) => s.highContrast);
  const toggleContrast = useUiStore((s) => s.toggleContrast);
  const wideSpacing = useUiStore((s) => s.wideSpacing);
  const toggleSpacing = useUiStore((s) => s.toggleSpacing);
  const resetA11y = useUiStore((s) => s.resetA11y);

  return (
    <div className="fixed bottom-4 left-4 z-50 flex flex-col items-start gap-2">
      {open && (
        <div className="card w-64 !rounded-2xl !p-4 shadow-lift">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold">
            <Accessibility className="h-4 w-4" /> {t("a11y.title")}
          </div>
          <div className="mb-3">
            <div className="label">{t("a11y.fontSize")}</div>
            <div className="flex gap-1">
              {SIZES.map((s, i) => (
                <button
                  key={s}
                  onClick={() => setFontSize(i as never)}
                  className={`flex-1 rounded-lg border py-1.5 text-xs font-bold transition ${fontSize === i ? "border-brand bg-brand text-brand-ink" : "border-ink/20 hover:bg-ink/5"}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="mb-3 space-y-2">
            <button
              onClick={toggleContrast}
              className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition ${highContrast ? "border-accent bg-accent/10 text-accent" : "border-ink/20 hover:bg-ink/5"}`}
            >
              <Highlighter className="h-4 w-4" /> {highContrast ? "✓ " : ""}{t("a11y.highContrast")}
            </button>
            <button
              onClick={toggleSpacing}
              className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition ${wideSpacing ? "border-accent bg-accent/10 text-accent" : "border-ink/20 hover:bg-ink/5"}`}
            >
              <Rows3 className="h-4 w-4" /> {wideSpacing ? "✓ " : ""}{t("a11y.wideSpacing")}
            </button>
          </div>
          <button onClick={resetA11y} className="flex w-full items-center justify-center gap-2 rounded-lg bg-ink/5 px-3 py-2 text-xs font-semibold hover:bg-ink/10">
            <RotateCcw className="h-3.5 w-3.5" /> {t("a11y.reset")}
          </button>
        </div>
      )}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-full border border-ink/15 bg-white px-4 py-2.5 text-sm font-bold shadow-lift transition hover:bg-ink/5"
        aria-label={t("a11y.accessibility")}
      >
        <Type className="h-4 w-4" /> A
      </button>
    </div>
  );
}
