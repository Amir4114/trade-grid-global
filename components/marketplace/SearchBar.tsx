import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

type SearchBarProps = {
  name?: string;
  defaultValue?: string;
  placeholder?: string;
  className?: string;
};

export default function SearchBar({
  name = "q",
  defaultValue,
  placeholder = "Search products, suppliers, RFQs...",
  className = "",
}: SearchBarProps) {
  return (
    <div className={`relative ${className}`}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-500" />
      <Input
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="h-11 rounded-lg border-neutral-300 bg-white pl-9 text-neutral-950 shadow-sm"
      />
    </div>
  );
}
