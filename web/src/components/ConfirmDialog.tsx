"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { AlertTriangle } from "lucide-react";

type ConfirmOpts = {
  title?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
};
type ConfirmFn = (message: string, opts?: ConfirmOpts) => Promise<boolean>;

const ConfirmCtx = createContext<ConfirmFn>(async () => false);

export function useConfirm() {
  return useContext(ConfirmCtx);
}

type State = { message: string; opts: ConfirmOpts; resolve: (v: boolean) => void };

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State | null>(null);

  const confirm = useCallback<ConfirmFn>((message, opts = {}) => {
    return new Promise<boolean>((resolve) => setState({ message, opts, resolve }));
  }, []);

  function close(value: boolean) {
    state?.resolve(value);
    setState(null);
  }

  const danger = state?.opts.danger ?? true;

  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      {state && (
        <div
          className="fade-in fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm"
          onClick={() => close(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="pop-in surface-pop w-full max-w-sm rounded-2xl border border-line bg-card p-6"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => { if (e.key === "Escape") close(false); }}
          >
            <div className="flex gap-4">
              <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${danger ? "bg-danger/10 text-danger" : "bg-primary/10 text-primary"}`}>
                <AlertTriangle size={22} />
              </span>
              <div className="min-w-0 pt-0.5">
                <h3 className="text-base font-semibold text-ink">{state.opts.title ?? "Emin misiniz?"}</h3>
                <p className="mt-1 text-sm text-ink-soft">{state.message}</p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => close(false)} className="btn-ghost">
                {state.opts.cancelText ?? "Vazgeç"}
              </button>
              <button onClick={() => close(true)} autoFocus className={danger ? "btn-danger" : "btn-primary"}>
                {state.opts.confirmText ?? "Sil"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmCtx.Provider>
  );
}
