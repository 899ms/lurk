type ReportTableProps = {
  columns: string[];
  rows: (string | number)[][];
  /** What to say instead of an empty body. */
  empty: string;
};

/**
 * One block of the scorer report. Every cell arrives already formatted, because
 * the numbers are owned by lib/scorerReport.ts and a table that computes one of
 * them is a second source of truth for it.
 */
export function ReportTable({ columns, rows, empty }: ReportTableProps) {
  return (
    <div className="overflow-x-auto rounded-card border bg-surface">
      <table className="w-full text-body">
        <thead>
          <tr className="border-b text-left text-small text-fg-muted">
            {columns.map((column) => (
              <th key={column} className="p-4 whitespace-nowrap" style={{ fontWeight: 400 }}>
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td className="p-4 text-fg-muted" colSpan={columns.length}>
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={index} className="border-b last:border-0">
                {row.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className={
                      cellIndex === 0 ? "p-4 whitespace-nowrap" : "p-4 tabular-nums whitespace-nowrap"
                    }
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
