import { useState } from "react";
import { ChevronDown, Settings2, Sparkles } from "lucide-react";
import type { AnalysisSettings } from "@/lib/analysis/types";
import { MODE_PRESETS } from "@/lib/analysis/defaults";
import type { FieldErrors } from "@/lib/analysis/validation";
import { NumberField, Segmented, Toggle } from "@/components/common/FormPrimitives";

interface Props {
  settings: AnalysisSettings;
  onChange: (next: AnalysisSettings) => void;
  errors: FieldErrors;
  disabled?: boolean;
}

const MODE_OPTIONS = [
  { value: "conservative", label: "Conservative", description: "Strict quality, smaller pullbacks." },
  { value: "balanced", label: "Balanced", description: "Default screen — moderate filters." },
  { value: "opportunistic", label: "Opportunistic", description: "Wider net, deeper pullbacks." },
] as const;

export function AdvancedSettingsAccordion({
  settings,
  onChange,
  errors,
  disabled,
}: Props) {
  const [open, setOpen] = useState(false);

  const update = <K extends keyof AnalysisSettings>(key: K, value: AnalysisSettings[K]) => {
    onChange({ ...settings, [key]: value });
  };

  const applyMode = (mode: AnalysisSettings["mode"]) => {
    const preset = MODE_PRESETS[mode];
    onChange({
      ...settings,
      ...preset,
      mode,
    });
  };

  const hasErrors = Object.keys(errors).some((k) => k !== "symbol");

  const capSuffix = "B USD";
  const capHint = "Excludes smaller, less liquid names.";
  const capMin = 1;
  const capStep = 1;
  const capLabel = "Min market cap";

  return (
    <div
      className={`rounded-xl border bg-surface ${
        hasErrors ? "border-destructive/40" : "border-border"
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-sm font-medium"
      >
        <span className="flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-muted-foreground" />
          Advanced settings
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
            {settings.mode}
          </span>
          {hasErrors && (
            <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-destructive">
              fix issues
            </span>
          )}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <fieldset
          disabled={disabled}
          className="space-y-5 border-t border-border p-4 disabled:opacity-60"
        >
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <Sparkles className="h-3 w-3" />
              Mode
            </p>
            <Segmented
              ariaLabel="Analysis mode"
              value={settings.mode}
              onChange={applyMode}
              options={MODE_OPTIONS}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField
              id="minMarketCap"
              label={capLabel}
              suffix={capSuffix}
              value={settings.minMarketCapB}
              onChange={(v) => update("minMarketCapB", v)}
              hint={capHint}
              error={errors.minMarketCapB}
              min={capMin}
              step={capStep}
            />
            <NumberField
              id="topN"
              label="Top results"
              suffix="stocks"
              value={settings.topN}
              onChange={(v) => update("topN", Math.round(v))}
              hint="Between 3 and 25."
              error={errors.topN}
              min={3}
              max={25}
              step={1}
            />
            <NumberField
              id="minPullback"
              label="Min pullback"
              suffix="%"
              value={settings.minPullbackPct}
              onChange={(v) => update("minPullbackPct", v)}
              hint="From recent 52-wk high."
              error={errors.minPullbackPct}
              min={0}
              max={90}
              step={1}
            />
            <NumberField
              id="maxPullback"
              label="Max pullback"
              suffix="%"
              value={settings.maxPullbackPct}
              onChange={(v) => update("maxPullbackPct", v)}
              hint="Excludes potential broken trends."
              error={errors.maxPullbackPct}
              min={1}
              max={95}
              step={1}
            />
            <NumberField
              id="minOpMargin"
              label="Min operating margin"
              suffix="%"
              value={settings.minOperatingMarginPct}
              onChange={(v) => update("minOperatingMarginPct", v)}
              hint="Quality floor."
              error={errors.minOperatingMarginPct}
              min={-50}
              max={80}
              step={1}
            />
            <div /> {/* layout spacer on sm+ */}
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <Toggle
              id="allowNegFcf"
              label="Allow negative free cash flow"
              description="Otherwise FCF-negative names are screened out."
              checked={settings.allowNegativeFcf}
              onChange={(v) => update("allowNegativeFcf", v)}
            />
            <Toggle
              id="above200dma"
              label="Require above 200-day MA"
              description="Bias toward names still in long-term uptrend."
              checked={settings.requireAbove200dma}
              onChange={(v) => update("requireAbove200dma", v)}
            />
          </div>
        </fieldset>
      )}
    </div>
  );
}
