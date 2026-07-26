'use client';

interface SwitchProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}

/**
 * Glass-styled toggle switch. Used throughout the fine-tuning dashboard for
 * every boolean capability/feature flag instead of the automated wizard's
 * "Sí/No" card pair — a switch reads as instant, low-friction configuration
 * rather than a question to answer.
 */
export function Switch({ checked, onChange, label, description, disabled }: SwitchProps) {
  return (
    <label
      className={`flex items-start justify-between gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 transition-colors ${
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-white/[0.04]'
      }`}
    >
      <span className="min-w-0">
        <span className="block text-sm font-medium text-zinc-100">{label}</span>
        {description && <span className="mt-0.5 block text-xs leading-relaxed text-zinc-500">{description}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors duration-200 ${
          checked ? 'border-white/30 bg-white/25' : 'border-white/[0.1] bg-white/[0.03]'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${
            checked ? 'translate-x-[22px]' : 'translate-x-1'
          }`}
        />
      </button>
    </label>
  );
}
