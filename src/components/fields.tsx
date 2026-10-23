import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { LOCALE, formatNumber, isoToDisplay, parseDate, parseNumber } from '../format';

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base num shadow-sm ' +
  'focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 ' +
  'dark:border-slate-700 dark:bg-slate-950 aria-[invalid=true]:border-red-500';

interface FieldShellProps {
  id: string;
  label: string;
  hint?: ReactNode;
  error?: string | null;
  hideLabel?: boolean;
  children: ReactNode;
}

function FieldShell({ id, label, hint, error, hideLabel, children }: FieldShellProps) {
  // `relative` : ancre le libellé sr-only (positionné en absolu) dans les tableaux défilants.
  return (
    <div className="relative space-y-1">
      <label
        htmlFor={id}
        className={hideLabel ? 'sr-only' : 'block text-sm font-medium text-slate-700 dark:text-slate-300'}
      >
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-slate-500 dark:text-slate-400">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  /** Unité affichée à droite (€, %, mois…). */
  unit?: string;
  /** Nombre maximal de décimales affichées. */
  decimals?: number;
  /** Facteur entre la valeur stockée et la valeur affichée (100 pour un taux). */
  scale?: number;
  integer?: boolean;
  min?: number;
  max?: number;
  hint?: ReactNode;
  /** Erreur externe (validation du moteur). */
  error?: string | null;
  /** Libellé réservé aux lecteurs d'écran (cellules de tableau). */
  hideLabel?: boolean;
}

function toText(value: number, decimals: number): string {
  if (!Number.isFinite(value)) return '';
  // Affiche au plus `decimals` décimales, sans zéros inutiles (3,67 et non 3,670).
  return new Intl.NumberFormat(LOCALE, { maximumFractionDigits: decimals })
    .format(value)
    .replace(/[\u202F\u00A0]/g, '\u00A0');
}

/**
 * Champ numérique à la belge (virgule décimale, espaces de milliers).
 * La valeur n'est transmise que si la saisie est valide ; sinon un message
 * d'erreur en français s'affiche.
 */
export function NumberField({
  label,
  value,
  onChange,
  unit,
  decimals = 2,
  scale = 1,
  integer = false,
  min,
  max,
  hint,
  error,
  hideLabel,
}: NumberFieldProps) {
  const id = useId();
  const focused = useRef(false);
  const [text, setText] = useState(() => toText(value * scale, decimals));
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!focused.current) setText(toText(value * scale, decimals));
  }, [value, scale, decimals]);

  function handle(next: string) {
    setText(next);
    const n = parseNumber(next);
    if (n === null) {
      setLocalError('Saisissez un nombre valide (ex. 250 000 ou 3,67).');
      return;
    }
    if (integer && !Number.isInteger(n)) {
      setLocalError('Saisissez un nombre entier.');
      return;
    }
    if (min !== undefined && n < min) {
      setLocalError(`La valeur doit être au moins ${formatNumber(min, integer ? 0 : decimals)}.`);
      return;
    }
    if (max !== undefined && n > max) {
      setLocalError(`La valeur ne peut pas dépasser ${formatNumber(max, integer ? 0 : decimals)}.`);
      return;
    }
    setLocalError(null);
    onChange(n / scale);
  }

  const shown = localError ?? error ?? null;
  return (
    <FieldShell id={id} label={label} hint={hint} error={shown} hideLabel={hideLabel}>
      <div className="relative">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          className={`${inputClass} ${unit ? (unit.length > 1 ? 'pr-14' : 'pr-8') : ''}`}
          value={text}
          aria-invalid={shown ? true : undefined}
          aria-describedby={shown ? `${id}-error` : hint ? `${id}-hint` : undefined}
          onFocus={() => {
            focused.current = true;
          }}
          onBlur={() => {
            focused.current = false;
            if (!localError) setText(toText(value * scale, decimals));
          }}
          onChange={(e) => handle(e.target.value)}
        />
        {unit ? (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-slate-500">
            {unit}
          </span>
        ) : null}
      </div>
    </FieldShell>
  );
}

/** Taux saisi en pourcentage, stocké en fraction. */
export function PercentField(props: Omit<NumberFieldProps, 'scale' | 'unit'>) {
  return <NumberField decimals={3} {...props} scale={100} unit="%" />;
}

export function TextField({
  label,
  value,
  onChange,
  hint,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: ReactNode;
  error?: string | null;
}) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      <input id={id} type="text" className={inputClass} value={value} onChange={(e) => onChange(e.target.value)} />
    </FieldShell>
  );
}

/** Date JJ/MM/AAAA, stockée en ISO. */
export function DateField({ label, value, onChange }: { label: string; value: string; onChange: (iso: string) => void }) {
  const id = useId();
  const [text, setText] = useState(() => isoToDisplay(value));
  const [error, setError] = useState<string | null>(null);
  useEffect(() => setText(isoToDisplay(value)), [value]);
  return (
    <FieldShell id={id} label={label} hint="Format JJ/MM/AAAA" error={error}>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        placeholder="JJ/MM/AAAA"
        className={inputClass}
        value={text}
        aria-invalid={error ? true : undefined}
        onChange={(e) => {
          setText(e.target.value);
          const iso = parseDate(e.target.value);
          if (iso) {
            setError(null);
            onChange(iso);
          } else {
            setError('Saisissez une date valide au format JJ/MM/AAAA.');
          }
        }}
      />
    </FieldShell>
  );
}

export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
  hint,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (v: T) => void;
  hint?: ReactNode;
}) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} hint={hint}>
      <select id={id} className={inputClass} value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

export function CheckboxField({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: ReactNode;
}) {
  const id = useId();
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
        <input
          id={id}
          type="checkbox"
          className="h-5 w-5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        {label}
      </label>
      {hint ? <p className="pl-7 text-xs text-slate-500 dark:text-slate-400">{hint}</p> : null}
    </div>
  );
}
