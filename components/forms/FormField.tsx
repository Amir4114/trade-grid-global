import { Input } from "@/components/ui/input";

export default function FormField({ label, placeholder, type = "text" }: { label: string; placeholder: string; type?: string }) {
  return (
    <label className="block text-sm font-medium text-neutral-950">
      {label}
      <Input type={type} placeholder={placeholder} className="mt-2 h-10" />
    </label>
  );
}
