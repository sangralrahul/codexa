import { useEffect, useRef, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";
import { createPortal } from "react-dom";
import { Check, Loader2, X } from "lucide-react";
import { cn, initials } from "../lib/util";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "accent";
type Size = "sm" | "md" | "lg" | "icon" | "icon-sm";

const VARIANTS: Record<Variant, string> = {
  primary: "btn-primary",
  accent: "btn-primary",
  secondary: "bg-bg text-fg border border-border-strong hover:bg-surface",
  ghost: "text-muted hover:text-fg hover:bg-surface",
  danger: "bg-danger text-white hover:brightness-110",
};
const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5 rounded-md",
  md: "h-9 px-3.5 text-[13.5px] gap-2 rounded-md",
  lg: "h-11 px-5 text-[14.5px] gap-2 rounded-md",
  icon: "size-9 rounded-md",
  "icon-sm": "size-7 rounded-md",
};

export function Button({
  variant = "secondary",
  size = "md",
  loading,
  className,
  children,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; loading?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={cn(
        "inline-flex shrink-0 items-center justify-center font-medium whitespace-nowrap transition-[background-color,border-color,color,opacity] duration-150 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 className="spin" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-md border border-border-strong bg-bg px-3 text-[14px] text-fg outline-none transition-colors placeholder:text-dim focus:border-[var(--mark)] focus-visible:outline-1 focus-visible:outline-offset-0 focus-visible:outline-ring",
        className,
      )}
      {...rest}
    />
  );
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn("w-full resize-none bg-transparent text-[14.5px] leading-relaxed text-fg outline-none placeholder:text-dim", className)} {...rest} />;
}

export function Field({ label, htmlFor, hint, error, children }: { label: string; htmlFor: string; hint?: ReactNode; error?: string | null; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-[13px] font-medium text-fg">
        {label}
      </label>
      {children}
      {error ? (
        <p role="alert" className="text-[12.5px] text-danger">
          {error}
        </p>
      ) : hint ? (
        <p className="text-[12.5px] text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("spin size-4 text-muted", className)} aria-label="Loading" />;
}

// Monochrome avatars: a few greys, always with legible initials.
const AVATAR_TONES = [
  ["var(--fg)", "var(--bg)"],
  ["var(--muted)", "var(--bg)"],
  ["var(--border-strong)", "var(--fg)"],
  ["var(--surface)", "var(--fg)"],
];
export function Avatar({ name, size = 28 }: { name: string; size?: number }) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold"
      style={{ width: size, height: size, fontSize: size * 0.4, background: AVATAR_TONES[h % AVATAR_TONES.length][0], color: AVATAR_TONES[h % AVATAR_TONES.length][1] }}
    >
      {initials(name)}
    </span>
  );
}

export function Badge({ children, tone = "neutral", className }: { children: ReactNode; tone?: "neutral" | "success" | "warning" | "danger" | "accent"; className?: string }) {
  const tones = {
    neutral: "bg-surface text-muted border-border",
    success: "bg-success/10 text-success border-success/25",
    warning: "bg-warning/10 text-warning border-warning/25",
    danger: "bg-danger/10 text-danger border-danger/25",
    accent: "bg-bg text-fg border-border-strong",
  };
  return <span className={cn("inline-flex h-5 items-center gap-1 rounded-full border px-2 text-[11px] font-medium", tones[tone], className)}>{children}</span>;
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="inline-flex h-[18px] min-w-5 items-center justify-center rounded border border-border-strong px-1 font-mono text-[10.5px] text-muted">{children}</kbd>;
}

export function EmptyState({ icon, title, body, action }: { icon?: ReactNode; title: string; body?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border-strong px-6 py-14 text-center">
      {icon ? <div className="mb-4 flex size-10 items-center justify-center rounded-md border border-border-strong bg-card text-muted [&_svg]:size-5">{icon}</div> : null}
      <p className="text-[15px] font-semibold">{title}</p>
      {body ? <p className="mx-auto mt-1.5 max-w-sm text-[13.5px] leading-relaxed text-muted">{body}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

/** Small popover menu anchored to its trigger; closes on outside click and Escape. */
export function Menu({ trigger, children, align = "end", width = 200 }: { trigger: (open: boolean, toggle: () => void) => ReactNode; children: (close: () => void) => ReactNode; align?: "start" | "end"; width?: number }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return (
    <div ref={ref} className="relative">
      {trigger(open, () => setOpen((o) => !o))}
      {open ? (
        <div role="menu" style={{ width }} className={cn("fade-in absolute top-full z-50 mt-1.5 rounded-lg border border-border-strong bg-card p-1", align === "end" ? "right-0" : "left-0")}>
          {children(() => setOpen(false))}
        </div>
      ) : null}
    </div>
  );
}

export function MenuItem({ icon, children, onSelect, danger, checked }: { icon?: ReactNode; children: ReactNode; onSelect: () => void; danger?: boolean; checked?: boolean }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onSelect}
      className={cn("flex h-8 w-full items-center gap-2.5 rounded-md px-2.5 text-left text-[13px] transition-colors hover:bg-surface [&_svg]:size-4", danger ? "text-danger" : "text-fg")}
    >
      {icon ? <span className={cn("shrink-0", danger ? "" : "text-muted")}>{icon}</span> : null}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {checked ? <Check className="text-muted" /> : null}
    </button>
  );
}

export function MenuSeparator() {
  return <div className="my-1 h-px bg-border" />;
}

export function Dialog({ open, onClose, title, description, children, width = 440 }: { open: boolean; onClose: () => void; title: string; description?: ReactNode; children: ReactNode; width?: number }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-6" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} style={{ width }} className="fade-in max-w-full rounded-[10px] border border-border-strong bg-card p-6">
        <div className="mb-4 flex items-start gap-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-[16px] font-semibold tracking-[-0.01em]">{title}</h2>
            {description ? <p className="mt-1 text-[13.5px] leading-relaxed text-muted">{description}</p> : null}
          </div>
          <Button variant="ghost" size="icon-sm" aria-label="Close" onClick={onClose}>
            <X />
          </Button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

// Toasts ---------------------------------------------------------------------------------------

type Toast = { id: number; title: string; body?: string; tone: "info" | "success" | "error" };
let pushToast: (t: Omit<Toast, "id">) => void = () => {};
export const toast = {
  success: (title: string, body?: string) => pushToast({ title, body, tone: "success" }),
  error: (title: string, body?: string) => pushToast({ title, body, tone: "error" }),
  info: (title: string, body?: string) => pushToast({ title, body, tone: "info" }),
};

export function Toaster() {
  const [items, setItems] = useState<Toast[]>([]);
  useEffect(() => {
    let n = 0;
    pushToast = (t) => {
      const id = ++n;
      setItems((cur) => [...cur.slice(-3), { ...t, id }]);
      setTimeout(() => setItems((cur) => cur.filter((x) => x.id !== id)), 4500);
    };
  }, []);
  return createPortal(
    <div className="pointer-events-none fixed bottom-4 right-4 z-[200] flex w-80 flex-col gap-2" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className="fade-in pointer-events-auto rounded-lg border border-border-strong bg-card px-4 py-3">
          <p className={cn("flex items-center gap-2 text-[13.5px] font-medium", t.tone === "error" ? "text-danger" : "text-fg")}>
            <span className={cn("size-1.5 rounded-full", t.tone === "error" ? "bg-danger" : t.tone === "success" ? "bg-success" : "bg-muted")} />
            {t.title}
          </p>
          {t.body ? <p className="mt-0.5 pl-3.5 text-[12.5px] text-muted">{t.body}</p> : null}
        </div>
      ))}
    </div>,
    document.body,
  );
}

const MARK = "M35.61 25.05 21.21 33.31 21.21 83.20 50 99.91 59.98 94.14 31.09 77.25 31 39.25 45.59 30.81ZM83.59 19.48 83.02 69.39 64.02 79.94 35.61 63.44 35.70 75.05 64.20 91.45 93.19 74.95 93.19 25.05ZM16.41 80.52 16.98 30.61 35.98 20.06 64.39 36.56 64.30 24.95 35.80 8.55 6.81 25.05 6.81 74.95ZM64.39 74.95 78.79 66.69 78.79 16.80 50 0.09 40.02 5.86 68.91 22.75 69 60.75 54.41 69.19Z";

/** The Codexa mark (same path as the website's logo). */
export function Logo({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <path d={MARK} fill="currentColor" />
    </svg>
  );
}
