import type { Product, PublicProduct } from "@/lib/database/types";
import type { ProductFormValues } from "@/lib/products/types";
import {
  INCOTERMS_2020,
  LEAD_TIME_UNITS,
  TRADE_CURRENCIES,
  TRADE_UNITS,
  isValidIncoterm,
  isValidTradeCurrency,
  isValidTradeUnit,
  normalizeIncoterms,
  type IncotermCode,
  type LeadTimeUnit,
} from "@/lib/products/trade-constants";

export type ProductTradeShape = Pick<
  Product,
  | "moq"
  | "lead_time"
  | "incoterms"
  | "price"
  | "moq_quantity"
  | "moq_unit"
  | "lead_time_min"
  | "lead_time_max"
  | "lead_time_unit"
  | "incoterms_codes"
  | "price_amount"
  | "price_currency"
  | "price_unit"
  | "price_incoterm"
>;

export type SanitizedTradePayload = {
  moq: string;
  lead_time: string;
  incoterms: string;
  price: string;
  moq_quantity: number | null;
  moq_unit: string | null;
  lead_time_min: number | null;
  lead_time_max: number | null;
  lead_time_unit: string | null;
  incoterms_codes: string[];
  price_amount: number | null;
  price_currency: string | null;
  price_unit: string | null;
  price_incoterm: string | null;
};

const LEAD_TIME_UNIT_ALIASES: Record<string, LeadTimeUnit> = {
  day: "Days",
  days: "Days",
  week: "Weeks",
  weeks: "Weeks",
};

function parsePositiveNumber(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value <= 0) return null;
  return value;
}

function parseLeadTimeUnit(raw: string): LeadTimeUnit | "" {
  const normalized = raw.trim().toLowerCase();
  return LEAD_TIME_UNIT_ALIASES[normalized] ?? "";
}

function formatQuantity(value: number): string {
  return Number.isInteger(value) ? String(value) : String(value);
}

/** Parse legacy free-text MOQ such as "25 MT" into structured parts. */
export function parseLegacyMoq(text: string): {
  quantity: string;
  unit: string;
} {
  const trimmed = text.trim();
  if (!trimmed) return { quantity: "", unit: "" };

  const match = trimmed.match(/^(\d+(?:\.\d+)?)\s*([A-Za-z][A-Za-z0-9\s]*)$/);
  if (!match) return { quantity: "", unit: "" };

  const quantity = match[1];
  const unitCandidate = match[2].trim();
  const unit =
    TRADE_UNITS.find(
      (item) => item.toLowerCase() === unitCandidate.toLowerCase()
    ) ?? unitCandidate;

  return { quantity, unit };
}

/** Parse legacy lead-time text such as "14-21 days" or "14 to 21 Days". */
export function parseLegacyLeadTime(text: string): {
  min: string;
  max: string;
  unit: LeadTimeUnit | "";
} {
  const trimmed = text.trim();
  if (!trimmed) return { min: "", max: "", unit: "" };

  const rangeMatch = trimmed.match(
    /^(\d+(?:\.\d+)?)\s*(?:to|-|–)\s*(\d+(?:\.\d+)?)\s*([A-Za-z]+)\s*$/i
  );
  if (rangeMatch) {
    return {
      min: rangeMatch[1],
      max: rangeMatch[2],
      unit: parseLeadTimeUnit(rangeMatch[3]),
    };
  }

  const singleMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*([A-Za-z]+)\s*$/i);
  if (singleMatch) {
    const unit = parseLeadTimeUnit(singleMatch[2]);
    return { min: singleMatch[1], max: singleMatch[1], unit };
  }

  return { min: "", max: "", unit: "" };
}

/** Parse legacy comma-separated incoterms text into canonical codes. */
export function parseLegacyIncoterms(text: string): IncotermCode[] {
  if (!text.trim()) return [];
  return normalizeIncoterms(text.split(/[,;/]+/));
}

/** Parse legacy indicative price strings into structured parts. */
export function parseLegacyPrice(text: string): {
  amount: string;
  currency: string;
  unit: string;
  incoterm: string;
} {
  const trimmed = text.trim();
  if (!trimmed) {
    return { amount: "", currency: "", unit: "", incoterm: "" };
  }

  const currencyMatch = trimmed.match(
    new RegExp(
      `^(${TRADE_CURRENCIES.join("|")})\\s*(\\d+(?:\\.\\d+)?)(?:\\s*/\\s*|\\s+per\\s+)([A-Za-z][A-Za-z0-9\\s]*)(?:\\s*\\(?(${INCOTERMS_2020.join("|")})\\)?)?$`,
      "i"
    )
  );
  if (currencyMatch) {
    const unitCandidate = currencyMatch[3].trim();
    const unit =
      TRADE_UNITS.find(
        (item) => item.toLowerCase() === unitCandidate.toLowerCase()
      ) ?? unitCandidate;
    return {
      amount: currencyMatch[2],
      currency: currencyMatch[1].toUpperCase(),
      unit,
      incoterm: currencyMatch[4]?.toUpperCase() ?? "",
    };
  }

  const amountFirstMatch = trimmed.match(
    new RegExp(
      `^(\\d+(?:\\.\\d+)?)\\s*(${TRADE_CURRENCIES.join("|")})(?:\\s*/\\s*|\\s+per\\s+)([A-Za-z][A-Za-z0-9\\s]*)(?:\\s*\\(?(${INCOTERMS_2020.join("|")})\\)?)?$`,
      "i"
    )
  );
  if (amountFirstMatch) {
    const unitCandidate = amountFirstMatch[3].trim();
    const unit =
      TRADE_UNITS.find(
        (item) => item.toLowerCase() === unitCandidate.toLowerCase()
      ) ?? unitCandidate;
    return {
      amount: amountFirstMatch[1],
      currency: amountFirstMatch[2].toUpperCase(),
      unit,
      incoterm: amountFirstMatch[4]?.toUpperCase() ?? "",
    };
  }

  return { amount: "", currency: "", unit: "", incoterm: "" };
}

export function formatMoqDisplay(product: ProductTradeShape): string {
  if (product.moq_quantity != null && product.moq_unit) {
    return `${formatQuantity(product.moq_quantity)} ${product.moq_unit}`;
  }
  return product.moq.trim();
}

export function formatLeadTimeDisplay(product: ProductTradeShape): string {
  if (
    product.lead_time_min != null &&
    product.lead_time_max != null &&
    product.lead_time_unit
  ) {
    const unit = product.lead_time_unit.toLowerCase();
    if (product.lead_time_min === product.lead_time_max) {
      return `${product.lead_time_min} ${unit}`;
    }
    return `${product.lead_time_min}–${product.lead_time_max} ${unit}`;
  }
  return product.lead_time.trim();
}

export function formatIncotermsDisplay(product: ProductTradeShape): string {
  const codes = product.incoterms_codes ?? [];
  if (codes.length > 0) {
    return codes.join(", ");
  }
  return product.incoterms.trim();
}

export function formatPriceDisplay(product: ProductTradeShape): string {
  if (product.price_amount != null && product.price_currency && product.price_unit) {
    const basis = product.price_incoterm ? ` (${product.price_incoterm})` : "";
    return `${product.price_currency} ${formatQuantity(product.price_amount)} / ${product.price_unit}${basis}`;
  }
  return product.price.trim();
}

export function productToStructuredFormFields(
  product: Product
): Pick<
  ProductFormValues,
  | "moq_quantity"
  | "moq_unit"
  | "lead_time_min"
  | "lead_time_max"
  | "lead_time_unit"
  | "incoterms"
  | "price_amount"
  | "price_currency"
  | "price_unit"
  | "price_incoterm"
> {
  const hasStructuredMoq =
    product.moq_quantity != null && Boolean(product.moq_unit);
  const legacyMoq = parseLegacyMoq(product.moq ?? "");

  const hasStructuredLeadTime =
    product.lead_time_min != null &&
    product.lead_time_max != null &&
    Boolean(product.lead_time_unit);
  const legacyLeadTime = parseLegacyLeadTime(product.lead_time ?? "");

  const incoterms =
    (product.incoterms_codes ?? []).length > 0
      ? product.incoterms_codes ?? []
      : parseLegacyIncoterms(product.incoterms ?? "");

  const hasStructuredPrice =
    product.price_amount != null &&
    Boolean(product.price_currency) &&
    Boolean(product.price_unit);
  const legacyPrice = parseLegacyPrice(product.price ?? "");

  return {
    moq_quantity: hasStructuredMoq
      ? String(product.moq_quantity)
      : legacyMoq.quantity,
    moq_unit: hasStructuredMoq ? product.moq_unit ?? "" : legacyMoq.unit,
    lead_time_min: hasStructuredLeadTime
      ? String(product.lead_time_min)
      : legacyLeadTime.min,
    lead_time_max: hasStructuredLeadTime
      ? String(product.lead_time_max)
      : legacyLeadTime.max,
    lead_time_unit: hasStructuredLeadTime
      ? product.lead_time_unit ?? ""
      : legacyLeadTime.unit,
    incoterms,
    price_amount: hasStructuredPrice
      ? String(product.price_amount)
      : legacyPrice.amount,
    price_currency: hasStructuredPrice
      ? product.price_currency ?? ""
      : legacyPrice.currency,
    price_unit: hasStructuredPrice
      ? product.price_unit ?? ""
      : legacyPrice.unit,
    price_incoterm: hasStructuredPrice
      ? product.price_incoterm ?? ""
      : legacyPrice.incoterm,
  };
}

export function validateProductFormValues(
  values: ProductFormValues
): string | null {
  const moqQuantity = parsePositiveNumber(values.moq_quantity);
  const moqUnit = values.moq_unit.trim();
  const hasMoqQuantity = Boolean(values.moq_quantity.trim());
  const hasMoqUnit = Boolean(moqUnit);

  if (hasMoqQuantity !== hasMoqUnit) {
    return "Enter both MOQ quantity and unit, or leave both empty.";
  }
  if (hasMoqQuantity && moqQuantity == null) {
    return "MOQ quantity must be a positive number.";
  }
  if (hasMoqUnit && !isValidTradeUnit(moqUnit)) {
    return "Select a valid MOQ unit.";
  }

  const leadMin = parsePositiveNumber(values.lead_time_min);
  const leadMax = parsePositiveNumber(values.lead_time_max);
  const leadUnit = values.lead_time_unit.trim();
  const hasLeadMin = Boolean(values.lead_time_min.trim());
  const hasLeadMax = Boolean(values.lead_time_max.trim());
  const hasLeadUnit = Boolean(leadUnit);
  const hasAnyLead = hasLeadMin || hasLeadMax || hasLeadUnit;

  if (hasAnyLead) {
    if (!hasLeadMin || !hasLeadMax || !hasLeadUnit) {
      return "Enter minimum, maximum, and unit for lead time, or leave all empty.";
    }
    if (leadMin == null || leadMax == null) {
      return "Lead time values must be positive numbers.";
    }
    if (leadMax < leadMin) {
      return "Lead time maximum cannot be lower than minimum.";
    }
    if (!LEAD_TIME_UNITS.includes(leadUnit as LeadTimeUnit)) {
      return "Select a valid lead time unit.";
    }
  }

  const normalizedIncoterms = normalizeIncoterms(values.incoterms);
  if (values.incoterms.length > 0 && normalizedIncoterms.length === 0) {
    return "Select valid Incoterms from the list.";
  }
  if (
    values.incoterms.some(
      (item) => !isValidIncoterm(item.trim().toUpperCase())
    )
  ) {
    return "Only recognized Incoterms 2020 terms are allowed.";
  }

  const priceAmount = parsePositiveNumber(values.price_amount);
  const priceCurrency = values.price_currency.trim().toUpperCase();
  const priceUnit = values.price_unit.trim();
  const priceIncoterm = values.price_incoterm.trim().toUpperCase();
  const hasPriceAmount = Boolean(values.price_amount.trim());
  const hasPriceCurrency = Boolean(priceCurrency);
  const hasPriceUnit = Boolean(priceUnit);
  const hasPriceIncoterm = Boolean(priceIncoterm);
  const hasAnyPrice =
    hasPriceAmount || hasPriceCurrency || hasPriceUnit || hasPriceIncoterm;

  if (hasAnyPrice) {
    if (!hasPriceAmount || !hasPriceCurrency || !hasPriceUnit) {
      return "Enter amount, currency, and per-unit for indicative price, or leave all empty.";
    }
    if (priceAmount == null) {
      return "Indicative price amount must be a positive number.";
    }
    if (!isValidTradeCurrency(priceCurrency)) {
      return "Select a valid currency.";
    }
    if (!isValidTradeUnit(priceUnit)) {
      return "Select a valid price per-unit.";
    }
    if (hasPriceIncoterm && !isValidIncoterm(priceIncoterm)) {
      return "Select a valid price basis Incoterm.";
    }
  }

  const hsCode = values.hs_code.trim();
  if (hsCode && !/^[0-9]{4}(?:\.[0-9]{1,4}){0,3}$/.test(hsCode)) {
    return "HS code should use digits with optional dot separators (e.g. 1006.30).";
  }

  return null;
}

export function buildTradePayload(values: ProductFormValues): SanitizedTradePayload {
  const moqQuantity = parsePositiveNumber(values.moq_quantity);
  const moqUnit = isValidTradeUnit(values.moq_unit.trim())
    ? values.moq_unit.trim()
    : null;

  const leadMin = parsePositiveNumber(values.lead_time_min);
  const leadMax = parsePositiveNumber(values.lead_time_max);
  const leadUnitRaw = values.lead_time_unit.trim();
  const leadUnit = LEAD_TIME_UNITS.includes(leadUnitRaw as LeadTimeUnit)
    ? leadUnitRaw.toLowerCase()
    : null;

  const incotermsCodes = normalizeIncoterms(values.incoterms);

  const priceAmount = parsePositiveNumber(values.price_amount);
  const priceCurrency = isValidTradeCurrency(values.price_currency.trim())
    ? values.price_currency.trim().toUpperCase()
    : null;
  const priceUnit = isValidTradeUnit(values.price_unit.trim())
    ? values.price_unit.trim()
    : null;
  const priceIncotermRaw = values.price_incoterm.trim().toUpperCase();
  const priceIncoterm = isValidIncoterm(priceIncotermRaw)
    ? priceIncotermRaw
    : null;

  const moq =
    moqQuantity != null && moqUnit
      ? `${formatQuantity(moqQuantity)} ${moqUnit}`
      : "";

  let lead_time = "";
  if (leadMin != null && leadMax != null && leadUnit) {
    lead_time =
      leadMin === leadMax
        ? `${leadMin} ${leadUnit}`
        : `${leadMin}–${leadMax} ${leadUnit}`;
  }

  const incoterms = incotermsCodes.join(", ");

  let price = "";
  if (priceAmount != null && priceCurrency && priceUnit) {
    const basis = priceIncoterm ? ` (${priceIncoterm})` : "";
    price = `${priceCurrency} ${formatQuantity(priceAmount)} / ${priceUnit}${basis}`;
  }

  return {
    moq,
    lead_time,
    incoterms,
    price,
    moq_quantity: moqQuantity,
    moq_unit: moqUnit,
    lead_time_min: leadMin,
    lead_time_max: leadMax,
    lead_time_unit: leadUnit,
    incoterms_codes: incotermsCodes,
    price_amount: priceAmount,
    price_currency: priceCurrency,
    price_unit: priceUnit,
    price_incoterm: priceIncoterm,
  };
}

export function displayMoq(product: Product | PublicProduct): string {
  return formatMoqDisplay(product) || "On request";
}

export function displayLeadTime(product: Product | PublicProduct): string {
  return formatLeadTimeDisplay(product);
}

export function displayIncoterms(product: Product | PublicProduct): string {
  return formatIncotermsDisplay(product);
}

export function displayPrice(product: Product | PublicProduct): string {
  return formatPriceDisplay(product);
}
