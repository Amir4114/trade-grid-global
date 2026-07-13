/** Canonical trade units for MOQ and indicative price per-unit selection. */
export const TRADE_UNITS = [
  "MT",
  "KG",
  "G",
  "L",
  "ML",
  "Units",
  "Pieces",
  "Cartons",
  "Boxes",
  "Bags",
  "Pallets",
  "Containers",
] as const;

export type TradeUnit = (typeof TRADE_UNITS)[number];

export const TRADE_UNIT_OPTIONS = TRADE_UNITS.map((unit) => ({
  value: unit,
  label: unit,
}));

/** Lead-time duration units supported by the structured model. */
export const LEAD_TIME_UNITS = ["Days", "Weeks"] as const;

export type LeadTimeUnit = (typeof LEAD_TIME_UNITS)[number];

export const LEAD_TIME_UNIT_OPTIONS = LEAD_TIME_UNITS.map((unit) => ({
  value: unit,
  label: unit,
}));

/** Incoterms 2020 — controlled vocabulary for product listings. */
export const INCOTERMS_2020 = [
  "EXW",
  "FCA",
  "CPT",
  "CIP",
  "DAP",
  "DPU",
  "DDP",
  "FAS",
  "FOB",
  "CFR",
  "CIF",
] as const;

export type IncotermCode = (typeof INCOTERMS_2020)[number];

export const INCOTERM_OPTIONS = INCOTERMS_2020.map((code) => ({
  value: code,
  label: code,
}));

/** Currencies appropriate for international food trade on this platform. */
export const TRADE_CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "AED",
  "INR",
  "SAR",
] as const;

export type TradeCurrency = (typeof TRADE_CURRENCIES)[number];

export const TRADE_CURRENCY_OPTIONS = TRADE_CURRENCIES.map((code) => ({
  value: code,
  label: code,
}));

const INCOTERM_SET = new Set<string>(INCOTERMS_2020);
const TRADE_UNIT_SET = new Set<string>(TRADE_UNITS);
const CURRENCY_SET = new Set<string>(TRADE_CURRENCIES);

export function isValidIncoterm(value: string): value is IncotermCode {
  return INCOTERM_SET.has(value.toUpperCase());
}

export function isValidTradeUnit(value: string): value is TradeUnit {
  return TRADE_UNIT_SET.has(value);
}

export function isValidTradeCurrency(value: string): value is TradeCurrency {
  return CURRENCY_SET.has(value.toUpperCase());
}

export function normalizeIncoterms(values: string[]): IncotermCode[] {
  const seen = new Set<IncotermCode>();
  const result: IncotermCode[] = [];
  for (const raw of values) {
    const code = raw.trim().toUpperCase();
    if (isValidIncoterm(code) && !seen.has(code)) {
      seen.add(code);
      result.push(code);
    }
  }
  return result;
}
