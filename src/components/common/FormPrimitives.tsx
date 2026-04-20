import type { InputHTMLAttributes, ReactNode } from "react";

interface FieldProps {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  trailing?: ReactNode;
  children: ReactNode;
}

export function Field({ label, htmlFor, hint, error, trailing, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor={htmlFor} className="text-xs font-medium text-foreground">
          {label}
        </label>
        {trailing}
      </div>
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-[11px] text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

type NumberFieldProps = {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  hint?: string;
  error?: string;
  suffix?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "value" | "onChange" | "type">;

export function NumberField({
  id,
  label,
  value,
  onChange,
  hint,
  error,
  suffix,
  ...rest
}: NumberFieldProps) {
  return (
    <Field label={label} htmlFor={id} hint={hint} error={error}>
      <div
        className={`flex items-center rounded-md border bg-background transition-shadow focus-within:ring-2 focus-within:ring-ring/30 ${
          error ? "border-destructive/60" : "border-input"
        }`}
      >
        <input
          id={id}
          type="number"
          inputMode="decimal"
          value={Number.isFinite(value) ? value : ""}
          onChange={(e) => {
            const raw = e.target.value;
            onChange(raw === "" ? Number.NaN : Number(raw));
          }}
          className="h-10 w-full bg-transparent px-3 font-mono text-sm tabular-nums outline-none placeholder:text-muted-foreground/60"
          {...rest}
        />
        {suffix && (
          <span className="pr-3 font-mono text-xs text-muted-foreground">{suffix}</span>
        )}
      </div>
    </Field>
  );
}

interface ToggleProps {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function Toggle({ id, label, description, checked, onChange }: ToggleProps) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-start justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2.5"
    >
      <div className="min-w-0">
        <p className="text-xs font-medium">{label}</p>
        {description && (
          <p className="mt-0.5 text-[11px] text-muted-foreground">{description}</p>
        )}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
          checked ? "bg-primary" : "bg-muted-foreground/30"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-background shadow-soft transition-transform ${
            checked ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </button>
    </label>
  );
}

interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  description?: string;
}

interface SegmentedProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: ReadonlyArray<SegmentedOption<T>>;
  ariaLabel?: string;
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
}: SegmentedProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="grid gap-1.5 rounded-md border border-border bg-surface p-1 sm:grid-cols-3"
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={`rounded-md px-3 py-2 text-left text-xs transition-colors ${
              active
                ? "bg-surface-elevated shadow-soft"
                : "hover:bg-muted/60 text-muted-foreground"
            }`}
          >
            <p className={`font-medium ${active ? "text-foreground" : ""}`}>{opt.label}</p>
            {opt.description && (
              <p className="mt-0.5 text-[11px] text-muted-foreground">{opt.description}</p>
            )}
          </button>
        );
      })}
    </div>
  );
}
