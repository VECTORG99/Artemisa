'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useFocusTrap } from '@/hooks/use-focus-trap';

// ─── Liquid glass ───────────────────────────────────────────────────────────
// Shared transparent, frosted-glass style for every card/panel/button on the
// landing page. Kept intentionally light on blur and background tint so it
// reads as glass over the scene, not a white/dark solid panel.

export const glassStyle: React.CSSProperties = {
  backdropFilter: 'blur(9px) saturate(140%)',
  WebkitBackdropFilter: 'blur(9px) saturate(140%)',
  background: 'rgba(255,255,255,0.02)',
  border: '1px solid rgba(255,255,255,0.08)',
  boxShadow: '0 4px 24px rgba(0,0,0,0.25)',
};

export type LandingModalId = 'compatibilidad' | 'legal';

interface LandingModalContextValue {
  openModal: LandingModalId | null;
  open: (id: LandingModalId) => void;
  close: () => void;
}

const LandingModalContext = createContext<LandingModalContextValue | null>(null);

/**
 * Shares which (if any) informational modal is open between the floating
 * nav (which triggers it) and the modal renderer (which displays it). Kept
 * out of the scroll flow entirely — these are on-demand overlays, not
 * landing sections.
 */
export function LandingModalProvider({ children }: { children: React.ReactNode }) {
  const [openModal, setOpenModal] = useState<LandingModalId | null>(null);

  const open = useCallback((id: LandingModalId) => setOpenModal(id), []);
  const close = useCallback(() => setOpenModal(null), []);

  return <LandingModalContext.Provider value={{ openModal, open, close }}>{children}</LandingModalContext.Provider>;
}

export function useLandingModal() {
  const ctx = useContext(LandingModalContext);
  if (!ctx) throw new Error('useLandingModal must be used within LandingModalProvider');
  return ctx;
}

/**
 * Generic overlay modal: dims the background, traps focus visually, closes
 * on the × button, Escape key, or a click outside the card. Only mounted
 * (and only intercepts Escape/clicks) while `open` is true.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const trapRef = useFocusTrap(open);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={trapRef}
        tabIndex={-1}
        className="relative max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/[0.08] bg-black/90 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.6)] backdrop-blur-xl sm:p-10"
      >
        <h2 id="modal-title" className="pr-12 text-2xl font-bold text-white">
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.03] text-white/70 transition-colors hover:border-white/20 hover:bg-white/[0.08] hover:text-white sm:right-5 sm:top-5"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        {children}
      </div>
    </div>
  );
}
