'use client';

import { useEffect } from 'react';
import { LuKeyboard, LuX } from 'react-icons/lu';
import { glassPanel, glassPill } from '@/lib/glass';
import { useFocusTrap } from '@/hooks/use-focus-trap';

interface Shortcut {
  keys: string[];
  action: string;
}

const GROUPS: { title: string; shortcuts: Shortcut[] }[] = [
  {
    title: 'Flujo de preguntas',
    shortcuts: [
      { keys: ['Enter'], action: 'Continuar a la siguiente pregunta' },
      { keys: ['Ctrl', 'Enter'], action: 'Continuar desde un campo de texto largo' },
      { keys: ['Alt', '←'], action: 'Volver a la pregunta anterior' },
      { keys: ['S'], action: 'Responder «Sí» en preguntas de sí/no' },
      { keys: ['N'], action: 'Responder «No» en preguntas de sí/no' },
    ],
  },
  {
    title: 'Navegación',
    shortcuts: [
      { keys: ['Esc'], action: 'Salir del modo actual y volver al menú' },
      { keys: ['?'], action: 'Mostrar u ocultar esta ayuda' },
    ],
  },
];

interface ShortcutsOverlayProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Discoverability layer for the keyboard shortcuts (issue #386). Without it
 * the shortcuts exist but nothing announces them, so only the author knows
 * the flow can be completed without touching the mouse.
 */
export function ShortcutsOverlay({ open, onClose }: ShortcutsOverlayProps) {
  const trapRef = useFocusTrap(open);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    }
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-title"
      onClick={onClose}
    >
      <div
        ref={trapRef}
        tabIndex={-1}
        className={glassPanel('w-full max-w-lg rounded-3xl p-6')}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <LuKeyboard className="h-5 w-5 text-zinc-400" aria-hidden="true" />
            <h2 id="shortcuts-title" className="text-lg font-semibold text-white">
              Atajos de teclado
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar atajos"
            className="rounded-full p-1.5 text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            <LuX className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-5 flex flex-col gap-5">
          {GROUPS.map((group) => (
            <div key={group.title} className="flex flex-col gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">{group.title}</span>
              <ul className="flex flex-col gap-1.5">
                {group.shortcuts.map((shortcut) => (
                  <li key={shortcut.action} className="flex items-center justify-between gap-4 text-sm">
                    <span className="text-zinc-300">{shortcut.action}</span>
                    <span className="flex shrink-0 items-center gap-1">
                      {shortcut.keys.map((key) => (
                        <kbd key={key} className={glassPill('px-2 py-0.5 font-mono text-[11px] text-zinc-200')}>
                          {key}
                        </kbd>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="mt-5 text-xs leading-relaxed text-zinc-600">
          Los atajos de una tecla se ignoran mientras escribes en un campo de texto.
        </p>
      </div>
    </div>
  );
}
