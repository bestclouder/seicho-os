"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";

type ToastAction = { label: string; onClick: () => void };
type Toast = {
  id: number;
  message: string;
  kind: "info" | "error";
  action?: ToastAction;
};

const ToastContext = createContext<
  (message: string, kind?: Toast["kind"], action?: ToastAction) => void
>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const push = useCallback(
    (message: string, kind: Toast["kind"] = "info", action?: ToastAction) => {
      const id = nextId.current++;
      setToasts((t) => [...t, { id, message, kind, action }]);
      // Actionable toasts linger long enough to actually tap Undo
      setTimeout(
        () => {
          setToasts((t) => t.filter((x) => x.id !== id));
        },
        action ? 8000 : 4500,
      );
    },
    [],
  );

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`animate-rise pointer-events-auto flex max-w-sm items-center gap-3 rounded-lg px-4 py-2.5 text-sm shadow-lg ${
              t.kind === "error"
                ? "bg-clay text-white"
                : "bg-ink text-paper"
            }`}
          >
            <span>{t.message}</span>
            {t.action && (
              <button
                onClick={() => {
                  setToasts((list) => list.filter((x) => x.id !== t.id));
                  t.action!.onClick();
                }}
                className="shrink-0 font-mono text-[11px] font-semibold uppercase tracking-wider underline underline-offset-4"
              >
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
