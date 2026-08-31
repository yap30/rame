// ============================================================
// RAME — primitives UI kecil (tanpa dependency berat)
// ============================================================
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";

export function Spinner({ className = "h-5 w-5" }: { className?: string }) {
  return <Loader2 className={`animate-spin ${className}`} aria-label="loading" />;
}

/** Ikon "!" dengan tooltip konteks saat hover/klik (aksesibel: keyboard) */
export function InfoTip({ text, className = "" }: { text: string; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span
      className={`relative inline-flex align-middle ${className}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onClick={(e) => {
        e.stopPropagation();
        setOpen((o) => !o);
      }}
    >
      <span
        role="img"
        aria-label="Info"
        tabIndex={0}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-current text-[9px] font-black leading-none opacity-70 transition hover:opacity-100"
      >
        !
      </span>
      {open && (
        <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-60 -translate-x-1/2 rounded-xl border border-ink/10 bg-white p-2.5 text-left text-[11px] font-medium leading-snug text-ink/80 shadow-lift">
          {text}
        </span>
      )}
    </span>
  );
}

export function Button({
  children,
  variant = "primary",
  loading = false,
  className = "",
  ...props
}: {
  children: ReactNode;
  variant?: "primary" | "accent" | "ghost" | "outline-brand";
  loading?: boolean;
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const cls =
    variant === "primary" ? "btn-primary" : variant === "accent" ? "btn-accent" : variant === "ghost" ? "btn-ghost" : "btn-outline-brand";
  return (
    <button className={`${cls} ${className}`} disabled={loading || props.disabled} {...props}>
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  );
}

export function StatCard({ value, label, icon }: { value: string; label: string; icon?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-1 text-center">
      {icon && <div className="text-xl">{icon}</div>}
      <div className="font-display text-3xl font-bold text-brand">{value}</div>
      <div className="text-xs font-medium uppercase tracking-wide text-ink/60">{label}</div>
    </div>
  );
}

export function ProgressBar({ value, className = "" }: { value: number; className?: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(value * 100)));
  return (
    <div className={`h-2 w-full overflow-hidden rounded-full bg-ink/10 ${className}`} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <motion.div
        className="h-full rounded-full bg-accent"
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      />
    </div>
  );
}

export function EmptyState({ icon = "🗂️", title, hint }: { icon?: string; title: string; hint?: string }) {
  return (
    <div className="card flex flex-col items-center gap-2 py-12 text-center">
      <div className="text-4xl">{icon}</div>
      <div className="font-display text-lg font-bold">{title}</div>
      {hint && <div className="max-w-md text-sm text-ink/60">{hint}</div>}
    </div>
  );
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "brand" | "accent" | "success" | "danger" }) {
  const tones = {
    neutral: "border-ink/15 bg-white/60 text-ink/70",
    brand: "border-brand/25 bg-brand/10 text-brand",
    accent: "border-accent/30 bg-accent/10 text-accent",
    success: "border-emerald-600/25 bg-emerald-50 text-emerald-700",
    danger: "border-red-600/25 bg-red-50 text-red-700",
  };
  return <span className={`chip ${tones[tone]}`}>{children}</span>;
}

export function FadeUp({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
