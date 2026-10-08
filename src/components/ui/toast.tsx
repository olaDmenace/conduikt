"use client";

import * as React from "react";
import { createContext, useContext, useState, useCallback, useMemo } from "react";
import { X, CheckCircle2, AlertTriangle, Info } from "@/src/components/ui/lucide-icons";
import { cn } from "@/src/lib/utils/cn";

type ToastVariant = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

// Toasts float above the page, so they get the one allowed shadow. The
// variant shows as the icon colour (plus a same-width danger or accent
// border when it needs attention), never a tinted wash.
const variantStyles: Record<ToastVariant, string> = {
  success: "border-line",
  error: "border-danger",
  warning: "border-accent",
  info: "border-line",
};

const variantIcons: Record<ToastVariant, React.ReactNode> = {
  success: <CheckCircle2 className="h-4 w-4 shrink-0 text-teal" />,
  error: <AlertTriangle className="h-4 w-4 shrink-0 text-danger" />,
  warning: <AlertTriangle className="h-4 w-4 shrink-0 text-accent" />,
  info: <Info className="h-4 w-4 shrink-0 text-text-2" />,
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, variant: ToastVariant = "info") => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const contextValue = useMemo(() => ({ toast: addToast }), [addToast]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {/* Toast Container */}
      <div
        className="fixed bottom-4 left-4 right-4 z-[10000] flex flex-col items-end gap-2 sm:bottom-6 sm:left-auto sm:right-6"
        role="status"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "flex w-full items-center gap-3 rounded-md border bg-surface px-4 py-3 text-text shadow-[var(--shadow-float)] animate-in sm:w-auto sm:min-w-[300px] sm:max-w-[420px]",
              variantStyles[t.variant]
            )}
          >
            {variantIcons[t.variant]}
            <p className="flex-1 text-body-s text-text">{t.message}</p>
            <button
              type="button"
              onClick={() => removeToast(t.id)}
              aria-label="Dismiss"
              className="rounded-sm p-0.5 text-text-3 transition-colors duration-[var(--duration-fast)] delay-[var(--hover-delay)] hover:text-text"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
