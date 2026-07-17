"use client";

import { Input } from "@/components/ui/input";
import type { QuotationFormValues } from "@/lib/quotation/types";

type Props = {
  values: QuotationFormValues;
  onChange: (values: QuotationFormValues) => void;
  disabled?: boolean;
};

function FieldLabel({
  htmlFor,
  children,
}: {
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="text-sm font-medium text-neutral-800">
      {children}
    </label>
  );
}

export default function QuotationFormFields({ values, onChange, disabled }: Props) {
  const set = <K extends keyof QuotationFormValues>(
    key: K,
    value: QuotationFormValues[K]
  ) => onChange({ ...values, [key]: value });

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <FieldLabel htmlFor="q-currency">Currency</FieldLabel>
        <Input
          id="q-currency"
          value={values.currency}
          disabled={disabled}
          onChange={(e) => set("currency", e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <FieldLabel htmlFor="q-unit-price">Unit price</FieldLabel>
        <Input
          id="q-unit-price"
          value={values.unit_price}
          disabled={disabled}
          onChange={(e) => set("unit_price", e.target.value)}
          placeholder="850"
        />
      </div>
      <div className="space-y-2">
        <FieldLabel htmlFor="q-price-unit">Price unit</FieldLabel>
        <Input
          id="q-price-unit"
          value={values.price_unit}
          disabled={disabled}
          onChange={(e) => set("price_unit", e.target.value)}
          placeholder="MT"
        />
      </div>
      <div className="space-y-2">
        <FieldLabel htmlFor="q-total">Total price (optional)</FieldLabel>
        <Input
          id="q-total"
          value={values.total_price}
          disabled={disabled}
          onChange={(e) => set("total_price", e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <FieldLabel htmlFor="q-incoterm">Incoterm</FieldLabel>
        <Input
          id="q-incoterm"
          value={values.incoterm}
          disabled={disabled}
          onChange={(e) => set("incoterm", e.target.value)}
          placeholder="FOB"
        />
      </div>
      <div className="space-y-2">
        <FieldLabel htmlFor="q-validity">Offer validity</FieldLabel>
        <Input
          id="q-validity"
          type="datetime-local"
          value={values.validity_until}
          disabled={disabled}
          onChange={(e) => set("validity_until", e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <FieldLabel htmlFor="q-lt-min">Lead time min</FieldLabel>
        <Input
          id="q-lt-min"
          value={values.lead_time_min}
          disabled={disabled}
          onChange={(e) => set("lead_time_min", e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <FieldLabel htmlFor="q-lt-max">Lead time max</FieldLabel>
        <Input
          id="q-lt-max"
          value={values.lead_time_max}
          disabled={disabled}
          onChange={(e) => set("lead_time_max", e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <FieldLabel htmlFor="q-lt-unit">Lead time unit</FieldLabel>
        <Input
          id="q-lt-unit"
          value={values.lead_time_unit}
          disabled={disabled}
          onChange={(e) => set("lead_time_unit", e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <FieldLabel htmlFor="q-moq">MOQ</FieldLabel>
        <Input
          id="q-moq"
          value={values.moq_quantity}
          disabled={disabled}
          onChange={(e) => set("moq_quantity", e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <FieldLabel htmlFor="q-moq-unit">MOQ unit</FieldLabel>
        <Input
          id="q-moq-unit"
          value={values.moq_unit}
          disabled={disabled}
          onChange={(e) => set("moq_unit", e.target.value)}
        />
      </div>
      <div className="space-y-2 md:col-span-2">
        <FieldLabel htmlFor="q-notes">Commercial notes</FieldLabel>
        <textarea
          id="q-notes"
          className="min-h-20 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm"
          value={values.notes}
          disabled={disabled}
          onChange={(e) => set("notes", e.target.value)}
          rows={3}
        />
      </div>
    </div>
  );
}
