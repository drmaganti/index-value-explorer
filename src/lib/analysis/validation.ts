import { z } from "zod";
import { SUPPORTED_SYMBOLS, type AnalysisSettings } from "./types";

const symbolSchema = z
  .string()
  .trim()
  .min(1, { message: "Enter an index symbol to analyze." })
  .max(8, { message: "Symbol looks too long — try QQQ, SPY, DIA, NIFTY, or SENSEX." })
  .regex(/^[A-Z][A-Z0-9.\-]*$/i, {
    message: "Use letters only — e.g. QQQ, SPY, DIA, NIFTY, SENSEX.",
  })
  .refine(
    (v) => (SUPPORTED_SYMBOLS as readonly string[]).includes(v.toUpperCase()),
    {
      message: `Only ${SUPPORTED_SYMBOLS.join(", ")} are supported right now.`,
    },
  );

export const settingsSchema = z
  .object({
    minMarketCapB: z
      .number({ message: "Enter a market-cap floor in billions." })
      .min(1, { message: "Market cap must be at least $1B." })
      .max(2000, { message: "Market cap floor seems too high." }),
    minPullbackPct: z
      .number({ message: "Enter a minimum pullback %." })
      .min(0, { message: "Pullback can't be negative." })
      .max(90, { message: "Min pullback above 90% is unrealistic." }),
    maxPullbackPct: z
      .number({ message: "Enter a maximum pullback %." })
      .min(1, { message: "Max pullback must be at least 1%." })
      .max(95, { message: "Max pullback above 95% is unrealistic." }),
    minOperatingMarginPct: z
      .number({ message: "Enter a minimum operating margin." })
      .min(-50, { message: "Margin floor is too low." })
      .max(80, { message: "Margin floor seems unrealistically high." }),
    allowNegativeFcf: z.boolean(),
    requireAbove200dma: z.boolean(),
    topN: z
      .number({ message: "Enter how many results to return." })
      .int({ message: "Top N must be a whole number." })
      .min(3, { message: "Return at least 3 results." })
      .max(25, { message: "Return at most 25 results." }),
    mode: z.enum(["conservative", "balanced", "opportunistic"]),
  })
  .refine((s) => s.minPullbackPct < s.maxPullbackPct, {
    path: ["minPullbackPct"],
    message: "Min pullback must be less than max pullback.",
  });

export const requestSchema = z.object({
  symbol: symbolSchema,
  settings: settingsSchema,
});

export type FieldErrors = Partial<
  Record<"symbol" | keyof AnalysisSettings, string>
>;

export interface ValidationResult {
  ok: boolean;
  errors: FieldErrors;
  normalizedSymbol?: string;
}

export function validateRequest(
  rawSymbol: string,
  settings: AnalysisSettings,
): ValidationResult {
  const symbolResult = symbolSchema.safeParse(rawSymbol);
  const settingsResult = settingsSchema.safeParse(settings);
  const errors: FieldErrors = {};

  if (!symbolResult.success) {
    errors.symbol = symbolResult.error.issues[0]?.message ?? "Invalid symbol.";
  }
  if (!settingsResult.success) {
    for (const issue of settingsResult.error.issues) {
      const key = issue.path[0] as keyof AnalysisSettings | undefined;
      if (key && !errors[key]) {
        errors[key] = issue.message;
      }
    }
  }

  return {
    ok: Object.keys(errors).length === 0,
    errors,
    normalizedSymbol: symbolResult.success ? symbolResult.data.toUpperCase() : undefined,
  };
}
