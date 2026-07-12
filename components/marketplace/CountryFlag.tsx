import type { CountryName } from "@/lib/marketplace/types";

const countryCodes: Record<CountryName, string> = {
  India: "IN",
  UAE: "AE",
  "Saudi Arabia": "SA",
  Pakistan: "PK",
  Turkey: "TR",
  Vietnam: "VN",
  China: "CN",
  Brazil: "BR",
};

function countryCode(country: string): string {
  return (
    countryCodes[country as CountryName] ??
    country.slice(0, 2).toUpperCase()
  );
}

export default function CountryFlag({ country }: { country: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="flex h-5 min-w-7 items-center justify-center rounded border border-neutral-200 bg-neutral-100 px-1 text-[10px] font-semibold text-neutral-700">
        {countryCode(country)}
      </span>
      <span>{country}</span>
    </span>
  );
}
