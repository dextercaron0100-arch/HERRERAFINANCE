import * as XLSX from "xlsx";

const PESO_FORMAT = '₱#,##0.00;[Red]-₱#,##0.00';

function safeFilePart(value: string) {
  return value.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
}

/**
 * Exports a generated Data Analyst report to a formatted .xlsx workbook:
 * a "Summary" sheet (scope/period/AI narrative/headline callouts) and a
 * "Data" sheet (the raw rows behind the chart). Self-contained — takes
 * plain data, not tied to React state. Modeled on cashAccountsExport.ts.
 */
export function exportDataAnalystReport(
  datasetLabel: string,
  scopeLabel: string,
  periodLabel: string,
  rows: Record<string, string | number>[],
  currencyColumns: string[] = [],
  narrative?: string,
  headlineCallouts?: { label: string; value: string }[],
): void {
  const generatedAt = new Date();
  const workbook = XLSX.utils.book_new();

  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
  const dataSheet = XLSX.utils.json_to_sheet(rows, { header: columns });

  dataSheet["!cols"] = columns.map((col) => ({
    wch: Math.max(14, Math.min(36, col.length + 4)),
  }));
  if (rows.length > 0) {
    dataSheet["!autofilter"] = {
      ref: `A1:${XLSX.utils.encode_col(columns.length - 1)}${rows.length + 1}`,
    };
  }

  const currencyColIndexes = currencyColumns
    .map((name) => columns.indexOf(name))
    .filter((idx) => idx >= 0);
  for (let row = 2; row <= rows.length + 1; row++) {
    for (const colIdx of currencyColIndexes) {
      const cellRef = `${XLSX.utils.encode_col(colIdx)}${row}`;
      const cell = dataSheet[cellRef];
      if (cell) cell.z = PESO_FORMAT;
    }
  }

  const summaryLines: (string | number | Date)[][] = [
    [`Data Analyst Report — ${datasetLabel}`],
    ["Scope", scopeLabel],
    ["Period", periodLabel],
    ["Generated At", generatedAt],
    [],
  ];
  if (narrative) {
    summaryLines.push(["AI Narrative"], [narrative], []);
  }
  if (headlineCallouts && headlineCallouts.length > 0) {
    summaryLines.push(["Headline Callouts"]);
    headlineCallouts.forEach((c) => summaryLines.push([c.label, c.value]));
  }

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryLines);
  summarySheet["!cols"] = [{ wch: 30 }, { wch: 60 }];
  if (summarySheet.B4) summarySheet.B4.z = "yyyy-mm-dd hh:mm";

  XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");
  XLSX.utils.book_append_sheet(workbook, dataSheet, "Data");

  const date = generatedAt.toISOString().slice(0, 10);
  const dataset = safeFilePart(datasetLabel) || "report";
  const scope = safeFilePart(scopeLabel) || "all-companies";
  XLSX.writeFile(workbook, `data-analyst-${dataset}-${scope}-${date}.xlsx`, { compression: true });
}
