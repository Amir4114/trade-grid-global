export type DataColumn<T> = {
  key: keyof T;
  label: string;
};

export default function DataTable<T extends Record<string, string | number>>({ columns, rows }: { columns: DataColumn<T>[]; rows: T[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              {columns.map((column) => <th key={String(column.key)} className="px-4 py-3 font-semibold">{column.label}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-neutral-50">
                {columns.map((column) => <td key={String(column.key)} className="px-4 py-3 text-neutral-700">{row[column.key]}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
