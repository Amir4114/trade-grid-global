import { getNames } from "country-list";

export const countries = getNames().map((country) => ({
  value: country,
  label: country,
}));