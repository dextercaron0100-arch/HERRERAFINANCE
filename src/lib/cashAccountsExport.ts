import * as XLSX from "xlsx";
import { CashAccount, Company } from "../types";

const PESO_FORMAT = '₱#,##0.00;[Red]-₱#,##0.00';

function safeFilePart(value: string) {
  return value.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
}

export function exportCashAccountsToExcel(
  accounts: CashAccount[],
  companies: Company[],
  scopeLabel: string,
) {
  const companyNames = new Map(companies.map((company) => [company.id, company.name]));
  const generatedAt = new Date();

  const accountRows = accounts.map((account) => ({
    Company: companyNames.get(account.companyId) || "Unknown",
    "Account Type": account.accountType,
    "Bank / Institution": account.bankName,
    "Account Name": account.accountName,
    "Account Number": account.accountNumber || "",
    "Account Holder": account.accountHolder,
    "Opening Balance": account.openingBalance ?? 0,
    "Current Balance": account.currentBalance ?? account.openingBalance ?? 0,
    Status: account.isActive ? "Active" : "Inactive",
    "Created At": account.createdAt ? new Date(account.createdAt) : null,
  }));

  const workbook = XLSX.utils.book_new();
  const accountsSheet = XLSX.utils.json_to_sheet(accountRows, {
    header: [
      "Company",
      "Account Type",
      "Bank / Institution",
      "Account Name",
      "Account Number",
      "Account Holder",
      "Opening Balance",
      "Current Balance",
      "Status",
      "Created At",
    ],
  });

  accountsSheet["!cols"] = [
    { wch: 28 }, { wch: 18 }, { wch: 24 }, { wch: 32 }, { wch: 22 },
    { wch: 30 }, { wch: 18 }, { wch: 18 }, { wch: 12 }, { wch: 20 },
  ];
  accountsSheet["!autofilter"] = { ref: `A1:J${Math.max(accountRows.length + 1, 1)}` };

  for (let row = 2; row <= accountRows.length + 1; row++) {
    const accountNumberCell = accountsSheet[`E${row}`];
    if (accountNumberCell) {
      accountNumberCell.t = "s";
      accountNumberCell.z = "@";
    }
    for (const column of ["G", "H"]) {
      const cell = accountsSheet[`${column}${row}`];
      if (cell) cell.z = PESO_FORMAT;
    }
    const dateCell = accountsSheet[`J${row}`];
    if (dateCell) dateCell.z = "yyyy-mm-dd hh:mm";
  }

  const lastDataRow = Math.max(accountRows.length + 1, 2);
  const summarySheet = XLSX.utils.aoa_to_sheet([
    ["Cash & Bank Accounts Export"],
    ["Scope", scopeLabel],
    ["Generated At", generatedAt],
    ["Total Accounts", { t: "n", v: 0, f: `COUNTA(Accounts!D2:D${lastDataRow})` }],
    ["Active Accounts", { t: "n", v: 0, f: `COUNTIF(Accounts!I2:I${lastDataRow},\"Active\")` }],
    ["Total Opening Balance", { t: "n", v: 0, f: `SUM(Accounts!G2:G${lastDataRow})` }],
    ["Total Current Balance", { t: "n", v: 0, f: `SUM(Accounts!H2:H${lastDataRow})` }],
    [],
    ["Account Type", "Count", "Current Balance"],
    ["Bank", { t: "n", v: 0, f: `COUNTIF(Accounts!B2:B${lastDataRow},A10)` }, { t: "n", v: 0, f: `SUMIF(Accounts!B2:B${lastDataRow},A10,Accounts!H2:H${lastDataRow})` }],
    ["E-Wallet", { t: "n", v: 0, f: `COUNTIF(Accounts!B2:B${lastDataRow},A11)` }, { t: "n", v: 0, f: `SUMIF(Accounts!B2:B${lastDataRow},A11,Accounts!H2:H${lastDataRow})` }],
    ["Cash on Hand", { t: "n", v: 0, f: `COUNTIF(Accounts!B2:B${lastDataRow},A12)` }, { t: "n", v: 0, f: `SUMIF(Accounts!B2:B${lastDataRow},A12,Accounts!H2:H${lastDataRow})` }],
    ["Main Vault", { t: "n", v: 0, f: `COUNTIF(Accounts!B2:B${lastDataRow},A13)` }, { t: "n", v: 0, f: `SUMIF(Accounts!B2:B${lastDataRow},A13,Accounts!H2:H${lastDataRow})` }],
  ]);

  summarySheet["!cols"] = [{ wch: 30 }, { wch: 24 }, { wch: 22 }];
  summarySheet["!merges"] = [XLSX.utils.decode_range("A1:C1")];
  if (summarySheet.B3) summarySheet.B3.z = "yyyy-mm-dd hh:mm";
  for (const address of ["B6", "B7", "C10", "C11", "C12", "C13"]) {
    if (summarySheet[address]) summarySheet[address].z = PESO_FORMAT;
  }

  XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");
  XLSX.utils.book_append_sheet(workbook, accountsSheet, "Accounts");

  const date = generatedAt.toISOString().slice(0, 10);
  const scope = safeFilePart(scopeLabel) || "all-companies";
  XLSX.writeFile(workbook, `cash-bank-accounts-${scope}-${date}.xlsx`, { compression: true });
}
