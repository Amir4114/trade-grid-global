"use client";

import { Input } from "@/components/ui/input";
import {
  RFQ_CATEGORIES,
  RFQ_VISIBILITY_LABELS,
  type RfqFormValues,
} from "@/lib/rfq/types";
import type { RfqVisibility } from "@/lib/database/types";

type Props = {
  values: RfqFormValues;
  onChange: (values: RfqFormValues) => void;
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

export default function RfqFormFields({ values, onChange, disabled }: Props) {
  const set = <K extends keyof RfqFormValues>(key: K, value: RfqFormValues[K]) => {
    onChange({ ...values, [key]: value });
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2 md:col-span-2">
        <FieldLabel htmlFor="rfq-title">Title</FieldLabel>
        <Input
          id="rfq-title"
          value={values.title}
          disabled={disabled}
          onChange={(e) => set("title", e.target.value)}
          placeholder="e.g. Basmati rice — Q4 container program"
        />
      </div>

      <div className="space-y-2">
        <FieldLabel htmlFor="rfq-product">Product name</FieldLabel>
        <Input
          id="rfq-product"
          value={values.product_name}
          disabled={disabled}
          onChange={(e) => set("product_name", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <FieldLabel htmlFor="rfq-category">Category</FieldLabel>
        <select
          id="rfq-category"
          className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm"
          value={values.category}
          disabled={disabled}
          onChange={(e) => set("category", e.target.value)}
        >
          {RFQ_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2 md:col-span-2">
        <FieldLabel htmlFor="rfq-description">Description / specifications</FieldLabel>
        <textarea
          id="rfq-description"
          className="min-h-24 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm"
          value={values.description}
          disabled={disabled}
          onChange={(e) => set("description", e.target.value)}
          rows={4}
        />
      </div>

      <div className="space-y-2">
        <FieldLabel htmlFor="rfq-qty">Quantity</FieldLabel>
        <Input
          id="rfq-qty"
          value={values.quantity_value}
          disabled={disabled}
          onChange={(e) => set("quantity_value", e.target.value)}
          placeholder="500"
        />
      </div>

      <div className="space-y-2">
        <FieldLabel htmlFor="rfq-unit">Unit</FieldLabel>
        <Input
          id="rfq-unit"
          value={values.quantity_unit}
          disabled={disabled}
          onChange={(e) => set("quantity_unit", e.target.value)}
          placeholder="MT"
        />
      </div>

      <div className="space-y-2">
        <FieldLabel htmlFor="rfq-packaging">Packaging requirement</FieldLabel>
        <Input
          id="rfq-packaging"
          value={values.packaging_requirement}
          disabled={disabled}
          onChange={(e) => set("packaging_requirement", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <FieldLabel htmlFor="rfq-country">Target country</FieldLabel>
        <Input
          id="rfq-country"
          value={values.target_country}
          disabled={disabled}
          onChange={(e) => set("target_country", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <FieldLabel htmlFor="rfq-port">Delivery port</FieldLabel>
        <Input
          id="rfq-port"
          value={values.delivery_port}
          disabled={disabled}
          onChange={(e) => set("delivery_port", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <FieldLabel htmlFor="rfq-deadline">Quote deadline</FieldLabel>
        <Input
          id="rfq-deadline"
          type="datetime-local"
          value={values.quote_deadline_at}
          disabled={disabled}
          onChange={(e) => set("quote_deadline_at", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <FieldLabel htmlFor="rfq-certs">
          Required certifications (comma-separated)
        </FieldLabel>
        <Input
          id="rfq-certs"
          value={values.required_certifications}
          disabled={disabled}
          onChange={(e) => set("required_certifications", e.target.value)}
          placeholder="ISO 22000, HACCP"
        />
      </div>

      <div className="space-y-2">
        <FieldLabel htmlFor="rfq-incoterms">
          Preferred Incoterms (comma-separated)
        </FieldLabel>
        <Input
          id="rfq-incoterms"
          value={values.preferred_incoterms}
          disabled={disabled}
          onChange={(e) => set("preferred_incoterms", e.target.value)}
          placeholder="FOB, CIF"
        />
      </div>

      <div className="space-y-2">
        <FieldLabel htmlFor="rfq-visibility">Visibility</FieldLabel>
        <select
          id="rfq-visibility"
          className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm"
          value={values.visibility}
          disabled={disabled}
          onChange={(e) => set("visibility", e.target.value as RfqVisibility)}
        >
          {(Object.keys(RFQ_VISIBILITY_LABELS) as RfqVisibility[]).map((key) => (
            <option key={key} value={key}>
              {RFQ_VISIBILITY_LABELS[key]}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2 md:col-span-2">
        <FieldLabel htmlFor="rfq-invites">
          Invite supplier company IDs (comma-separated UUIDs — required for
          invite-only)
        </FieldLabel>
        <Input
          id="rfq-invites"
          value={values.invite_supplier_ids.join(", ")}
          disabled={disabled}
          onChange={(e) =>
            set(
              "invite_supplier_ids",
              e.target.value
                .split(",")
                .map((part) => part.trim())
                .filter(Boolean)
            )
          }
          placeholder="uuid, uuid"
        />
      </div>

      <div className="space-y-2 md:col-span-2">
        <FieldLabel htmlFor="rfq-notes">Notes</FieldLabel>
        <textarea
          id="rfq-notes"
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
