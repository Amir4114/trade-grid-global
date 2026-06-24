import { Card, CardContent } from "@/components/ui/card";

export default function StatCard({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <Card className="rounded-lg border-neutral-200 bg-white shadow-sm">
      <CardContent className="p-5">
        <div className="text-sm text-neutral-500">{label}</div>
        <div className="mt-2 text-3xl font-semibold tracking-tight text-neutral-950">{value}</div>
        {detail ? <div className="mt-2 text-sm text-neutral-500">{detail}</div> : null}
      </CardContent>
    </Card>
  );
}
