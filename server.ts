import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import OpenAI from "openai";
import dotenv from "dotenv";
import { db } from "./src/db/index.ts";
import { attachments, cashAccounts } from "./src/db/schema.ts";
import { eq } from "drizzle-orm";
import { get, put } from "@vercel/blob";
import { createHmac, timingSafeEqual } from "node:crypto";
import { Readable } from "node:stream";

dotenv.config();

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-5.4-mini";
const SQL_CONFIGURED = Boolean(
  process.env.SQL_HOST &&
  process.env.SQL_USER &&
  process.env.SQL_PASSWORD &&
  process.env.SQL_DB_NAME
);

const Type = {
  OBJECT: "object",
  ARRAY: "array",
  STRING: "string",
  NUMBER: "number",
} as const;

type ContentPart =
  | { text: string }
  | { inlineData: { data: string; mimeType: string } };

function makeStrictJsonSchema(schema: any): any {
  if (!schema || typeof schema !== "object") return schema;
  if (Array.isArray(schema)) return schema.map(makeStrictJsonSchema);

  const normalized: any = {};
  for (const [key, value] of Object.entries(schema)) {
    normalized[key] = makeStrictJsonSchema(value);
  }
  if (normalized.type === "object") normalized.additionalProperties = false;
  return normalized;
}

async function generateContent({
  contents,
  config,
}: {
  contents: string | ContentPart[];
  config?: {
    systemInstruction?: string;
    responseMimeType?: string;
    responseSchema?: any;
    temperature?: number;
  };
}) {
  if (!openai) {
    throw new Error("OPENAI_API_KEY is not configured on the server.");
  }

  let input: any = contents;

  if (Array.isArray(contents)) {
    const content: any[] = contents.map((part) => {
      if ("text" in part) return { type: "input_text", text: part.text };

      const { data, mimeType } = part.inlineData;
      const dataUrl = `data:${mimeType};base64,${data}`;
      if (mimeType === "application/pdf") {
        return {
          type: "input_file",
          filename: "document.pdf",
          file_data: dataUrl,
        };
      }
      return { type: "input_image", image_url: dataUrl, detail: "auto" };
    });
    input = [{ role: "user", content }];
  }

  const request: any = {
    model: OPENAI_MODEL,
    instructions: config?.systemInstruction,
    input,
  };

  if (config?.responseMimeType === "application/json" && config.responseSchema) {
    request.text = {
      format: {
        type: "json_schema",
        name: "finance_response",
        strict: true,
        schema: makeStrictJsonSchema(config.responseSchema),
      },
    };
  } else if (config?.responseMimeType === "application/json") {
    request.text = { format: { type: "json_object" } };
  }

  const response = await openai.responses.create(request);
  return { text: response.output_text };
}

function handleError(e: any, res: express.Response, defaultMsg: string) {
  let errMsg = e.message || defaultMsg;
  console.error("API Error:", e);
  
  if (typeof e.message === 'string' && e.message.includes('{"error"')) {
    try {
      const jsonStr = e.message.substring(e.message.indexOf('{'));
      const parsedErr = JSON.parse(jsonStr);
      if (parsedErr.error?.message) errMsg = parsedErr.error.message;
    } catch (_) {}
  } else if (typeof e.message === 'string' && e.message.startsWith('{"error"')) {
    try {
      const parsedErr = JSON.parse(e.message);
      if (parsedErr.error?.message) errMsg = parsedErr.error.message;
    } catch (_) {}
  }
  
  if (errMsg.includes('429') || errMsg.toLowerCase().includes('rate limit')) {
      errMsg = "OpenAI API rate limit exceeded. Please try again in a moment.";
  }

  res.status(500).json({ error: errMsg });
}

function signDocumentPath(pathname: string) {
  const secret = process.env.DOCUMENT_ACCESS_SECRET || process.env.BLOB_READ_WRITE_TOKEN;
  if (!secret) throw new Error("Private document storage is not configured.");
  return createHmac("sha256", secret).update(pathname).digest("hex");
}

function hasValidDocumentSignature(pathname: string, signature: string) {
  const expected = Buffer.from(signDocumentPath(pathname), "utf8");
  const received = Buffer.from(signature || "", "utf8");
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export async function createApp(options: { serveFrontend?: boolean } = {}) {
  const app = express();
  const serveFrontend = options.serveFrontend ?? true;

  // Increase payload size limit since we might be sending base64 images
  app.use(express.json({ limit: '50mb' }));

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", database: "firestore", documents: Boolean(process.env.BLOB_READ_WRITE_TOKEN), ai: Boolean(process.env.OPENAI_API_KEY) });
  });

  app.post("/api/private-documents", async (req, res) => {
    try {
      if (!process.env.BLOB_READ_WRITE_TOKEN) return res.status(503).json({ error: "Private Blob storage is not configured." });
      const { dataUrl, fileName, companyId } = req.body || {};
      const match = typeof dataUrl === "string" ? dataUrl.match(/^data:([^;]+);base64,(.+)$/) : null;
      if (!match) return res.status(400).json({ error: "A base64 data URL is required." });
      const bytes = Buffer.from(match[2], "base64");
      if (bytes.length > 4_000_000) return res.status(413).json({ error: "File exceeds the 4 MB secure upload limit." });
      const safeName = String(fileName || "document").replace(/[^a-zA-Z0-9._-]/g, "-");
      const safeCompany = String(companyId || "shared").replace(/[^a-zA-Z0-9_-]/g, "-");
      const pathname = `finance/${safeCompany}/${Date.now()}-${safeName}`;
      const blob = await put(pathname, bytes, { access: "private", contentType: match[1], addRandomSuffix: true });
      const signature = signDocumentPath(blob.pathname);
      res.json({ pathname: blob.pathname, url: `/api/private-documents?pathname=${encodeURIComponent(blob.pathname)}&signature=${signature}` });
    } catch (e: any) {
      handleError(e, res, "Failed to upload private document");
    }
  });

  app.get("/api/private-documents", async (req, res) => {
    try {
      const pathname = String(req.query.pathname || "");
      const signature = String(req.query.signature || "");
      if (!pathname || !hasValidDocumentSignature(pathname, signature)) return res.status(403).json({ error: "Invalid document signature." });
      const result = await get(pathname, { access: "private", ifNoneMatch: req.headers["if-none-match"] as string | undefined });
      if (!result) return res.status(404).send("Not found");
      res.setHeader("Cache-Control", "private, no-cache");
      res.setHeader("ETag", result.blob.etag);
      if (result.statusCode === 304) return res.status(304).end();
      res.setHeader("Content-Type", result.blob.contentType);
      res.setHeader("X-Content-Type-Options", "nosniff");
      Readable.fromWeb(result.stream as any).pipe(res);
    } catch (e: any) {
      handleError(e, res, "Failed to retrieve private document");
    }
  });

  app.post("/api/scan-receipt", async (req, res) => {
    try {
      const { imageBase64, mimeType } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ error: "Missing imageBase64" });
      }

      const response = await generateContent({
        contents: [
          {
            text: "Extract transaction details from this receipt. Return ONLY the JSON object with the following fields: txnDate (string: YYYY-MM-DD), amount (number: total amount without currency symbols), purpose (string: concise vendor name or receipt purpose). If a field cannot be found, provide null or a sensible generic value. Do not wrap in markdown or anything else."
          },
          {
            inlineData: {
              data: imageBase64,
              mimeType: mimeType || "image/jpeg"
            }
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              txnDate: { type: Type.STRING, description: "Date of transaction in YYYY-MM-DD" },
              amount: { type: Type.NUMBER, description: "Total amount" },
              purpose: { type: Type.STRING, description: "Vendor name or summary" }
            },
            required: ["txnDate", "amount", "purpose"]
          }
        }
      });

      const textOutput = response.text || "{}";
      const parsed = JSON.parse(textOutput);
      res.json(parsed);
    } catch (e: any) {
      handleError(e, res, "Failed to parse receipt");
    }
  });

  app.post("/api/risk-assessment", async (req, res) => {
    try {
      const { transactions } = req.body;
      if (!transactions || !Array.isArray(transactions)) {
        return res.status(400).json({ error: "Missing or invalid transactions array" });
      }

      const promptString = `Please analyze the following ledger transactions and generate a concise risk assessment summary. Identify any suspicious anomalies, concentration risks, or unusual spending patterns. Address your analysis to a finance manager.
Transactions:
${JSON.stringify(transactions.slice(0, 50), null, 2)}
`;

      const response = await generateContent({
        contents: promptString,
        config: {
          systemInstruction: "You are a professional financial risk analyst.",
          temperature: 0.2,
        }
      });

      res.json({ summary: response.text });
    } catch (e: any) {
      handleError(e, res, "Failed to assess risk");
    }
  });


  app.post("/api/suggest-category", async (req, res) => {
    try {
      const { purpose, categories } = req.body;
      if (!purpose || !categories || !Array.isArray(categories)) {
        return res.status(400).json({ error: "Missing required parameters" });
      }

      const promptString = `Given the following transaction purpose/description: "${purpose}", suggest the most appropriate category ID from the list below. Return ONLY a valid JSON object matching this schema: { "categoryId": "string" }. If no category is a strong match, return null for categoryId.
Categories:
${JSON.stringify(categories, null, 2)}
`;

      const response = await generateContent({
        contents: promptString,
        config: {
          systemInstruction: "You are a specialized transaction categorization assistant.",
          temperature: 0.1,
          responseMimeType: "application/json",
        }
      });

      const textOutput = response.text || "{}";
      const parsed = JSON.parse(textOutput);
      res.json(parsed);

    } catch (e: any) {
      handleError(e, res, "Failed to suggest category");
    }
  });

  app.post("/api/financial-chat", async (req, res) => {
    try {
      const { message, context } = req.body;
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      const promptString = `You are a helpful, professional Herrera Financial Intelligence Assistant. 
The user is asking a question about their company's finances.
Here is the context (JSON):
${JSON.stringify(context, null, 2)}

User Question: ${message}

Provide a concise, insightful answer based ONLY on the provided context. Speak directly to the user.`;

      const response = await generateContent({
        contents: promptString,
        config: {
          systemInstruction: "You are a professional Herrera Financial Intelligence Assistant. Answer concisely.",
          temperature: 0.3,
        }
      });

      res.json({ reply: response.text });
    } catch (e: any) {
      handleError(e, res, "Failed to get chat response");
    }
  });

  app.post("/api/explain-profit", async (req, res) => {
    try {
      const { companyId, dateRange, summary, topExpenses, companyComparison, alerts } = req.body;
      
      const promptString = `You are a professional Herrera Financial Intelligence Assistant.
The business owner has asked you to explain their recent money flow and profitability.

Context:
- Company ID / View: ${companyId === "all" ? "Group Consolidated" : companyId}
- Date Range: ${dateRange}
- Summary Data:
${JSON.stringify(summary, null, 2)}
- Company Comparisons (if multiple):
${JSON.stringify(companyComparison, null, 2)}
- Top active alerts (Risks/Leaks):
${JSON.stringify(alerts, null, 2)}

Provide a concise, direct, and actionable executive summary.
Focus on answering:
1. What happened to profit and cash flow during this period?
2. Are there any major risks or money leaks that require attention right now?
3. What is the strongest area of the business?
4. Give 1-2 recommended next steps for the owner.

Do not use markdown headers (# or ##), but you can use bullet points. Speak in a confident, advisory tone.`;

      const response = await generateContent({
        contents: promptString,
        config: {
          systemInstruction: "You are a senior financial advisor acting as an AI assistant. Be direct, clear, and action-oriented.",
          temperature: 0.3,
        }
      });

      res.json({ explanation: response.text });
    } catch (e: any) {
      handleError(e, res, "Failed to generate explanation");
    }
  });

  app.post("/api/scan-account-document", async (req, res) => {
    try {
      const { documentBase64, mimeType } = req.body;
      if (!documentBase64) {
        return res.status(400).json({ error: "Missing documentBase64" });
      }

      const promptString = `Extract account details from this document (e.g. Bank statement, certification).
Return ONLY a valid JSON array of objects with the following fields: 
- accountType (string: "Bank" or "E-Wallet" or "Cash on Hand")
- bankName (string)
- accountName (string)
- accountNumber (string)
- accountHolder (string)
If a field cannot be found, provide null or a sensible generic value. Do not wrap in markdown or anything else.`;

      const response = await generateContent({
        contents: [
          {
            text: promptString
          },
          {
            inlineData: {
              data: documentBase64,
              mimeType: mimeType || "application/pdf"
            }
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                accountType: { type: Type.STRING, description: "Type of account: 'Bank', 'E-Wallet', or 'Cash on Hand'" },
                bankName: { type: Type.STRING },
                accountName: { type: Type.STRING },
                accountNumber: { type: Type.STRING },
                accountHolder: { type: Type.STRING }
              },
              required: ["accountType", "bankName", "accountName", "accountNumber", "accountHolder"]
            }
          }
        }
      });

      const textOutput = response.text || "[]";
      const parsed = JSON.parse(textOutput);
      res.json(parsed);
    } catch (e: any) {
      handleError(e, res, "Failed to parse document");
    }
  });

  app.post("/api/parse-accounts-text", async (req, res) => {
    try {
      const { text } = req.body;
      if (!text) {
        return res.status(400).json({ error: "Missing text" });
      }

      const promptString = `Extract account details from the following tabular data.
Return ONLY a valid JSON array of objects with the following fields: 
- accountType (string: "Bank" or "E-Wallet" or "Cash on Hand")
- bankName (string)
- accountName (string)
- accountNumber (string)
- accountHolder (string)
If a field cannot be found, provide null or a sensible generic value. Do not wrap in markdown or anything else.

DATA:
${text}`;

      const response = await generateContent({
        contents: [
          {
            text: promptString
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                accountType: { type: Type.STRING, description: "Type of account: 'Bank', 'E-Wallet', or 'Cash on Hand'" },
                bankName: { type: Type.STRING },
                accountName: { type: Type.STRING },
                accountNumber: { type: Type.STRING },
                accountHolder: { type: Type.STRING }
              },
              required: ["accountType", "bankName", "accountName", "accountNumber", "accountHolder"]
            }
          }
        }
      });

      const textOutput = response.text || "[]";
      const parsed = JSON.parse(textOutput);
      res.json(parsed);
    } catch (e: any) {
      handleError(e, res, "Failed to parse text");
    }
  });

  app.post("/api/attachments", async (req, res) => {
    if (!SQL_CONFIGURED) {
      return res.json({ success: true, attachment: req.body, storage: "local-only" });
    }
    try {
      const attachment = req.body;
      await db.insert(attachments).values(attachment);
      res.json({ success: true, attachment });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: "Failed to save attachment" });
    }
  });

  app.get("/api/attachments", async (req, res) => {
    if (!SQL_CONFIGURED) return res.json([]);
    try {
      const data = await db.select().from(attachments);
      res.json(data);
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: "Failed to fetch attachments" });
    }
  });

  app.get("/api/attachments/:companyId", async (req, res) => {
    if (!SQL_CONFIGURED) return res.json([]);
    try {
      const { companyId } = req.params;
      let data;
      if (companyId === "all") {
        data = await db.select().from(attachments);
      } else {
        data = await db.select().from(attachments).where(eq(attachments.companyId, companyId));
      }
      res.json(data);
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: "Failed to fetch attachments" });
    }
  });


  // ── CASH ACCOUNTS API ──────────────────────────────────────────────────────
  // GET /api/cash-accounts  – fetch all accounts
  app.get("/api/cash-accounts", async (req, res) => {
    if (!SQL_CONFIGURED) return res.status(503).json({ error: "SQL database is not configured; using local storage." });
    try {
      const data = await db.select().from(cashAccounts);
      res.json(data);
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: "Failed to fetch cash accounts" });
    }
  });

  // GET /api/cash-accounts/:companyId  – fetch by company
  app.get("/api/cash-accounts/:companyId", async (req, res) => {
    if (!SQL_CONFIGURED) return res.status(503).json({ error: "SQL database is not configured; using local storage." });
    try {
      const { companyId } = req.params;
      let data;
      if (companyId === "all") {
        data = await db.select().from(cashAccounts);
      } else {
        data = await db.select().from(cashAccounts).where(eq(cashAccounts.companyId, companyId));
      }
      res.json(data);
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: "Failed to fetch cash accounts" });
    }
  });

  // POST /api/cash-accounts  – create account
  app.post("/api/cash-accounts", async (req, res) => {
    if (!SQL_CONFIGURED) return res.status(503).json({ error: "SQL database is not configured; using local storage." });
    try {
      const payload = req.body;
      if (!payload.companyId || !payload.accountType || !payload.accountName) {
        return res.status(400).json({ error: "Missing required fields: companyId, accountType, accountName" });
      }
      const [inserted] = await db.insert(cashAccounts).values({
        companyId: payload.companyId,
        accountType: payload.accountType,
        bankName: payload.bankName || "",
        accountName: payload.accountName,
        accountNumber: payload.accountNumber || "",
        accountHolder: payload.accountHolder || "",
        openingBalance: payload.openingBalance ?? 0,
        isActive: payload.isActive ?? true,
      }).returning();
      res.json({ success: true, account: inserted });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: "Failed to create cash account" });
    }
  });

  // PUT /api/cash-accounts/:id  – update account
  app.put("/api/cash-accounts/:id", async (req, res) => {
    if (!SQL_CONFIGURED) return res.status(503).json({ error: "SQL database is not configured; using local storage." });
    try {
      const { id } = req.params;
      const payload = req.body;
      const [updated] = await db.update(cashAccounts)
        .set({
          accountType: payload.accountType,
          bankName: payload.bankName,
          accountName: payload.accountName,
          accountNumber: payload.accountNumber,
          accountHolder: payload.accountHolder,
          openingBalance: payload.openingBalance,
          isActive: payload.isActive,
        })
        .where(eq(cashAccounts.id, id))
        .returning();
      if (!updated) return res.status(404).json({ error: "Account not found" });
      res.json({ success: true, account: updated });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: "Failed to update cash account" });
    }
  });

  // DELETE /api/cash-accounts/:id  – delete account
  app.delete("/api/cash-accounts/:id", async (req, res) => {
    if (!SQL_CONFIGURED) return res.status(503).json({ error: "SQL database is not configured; using local storage." });
    try {
      const { id } = req.params;
      await db.delete(cashAccounts).where(eq(cashAccounts.id, id));
      res.json({ success: true });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: "Failed to delete cash account" });
    }
  });

  if (serveFrontend && process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else if (serveFrontend) {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  return app;
}

async function startServer() {
  const app = await createApp();
  const PORT = Number(process.env.PORT || 3000);
  app.listen(PORT, "0.0.0.0", () => console.log(`Server running on http://0.0.0.0:${PORT}`));
}


// ─── Seed cash accounts into SQL on server start ────────────────────────────
/* Seed cash accounts removed. Accounts must be created explicitly by users.
async function seedCashAccounts() {
  try {
    const existing = await db.select().from(cashAccounts);
    if (existing.length > 0) {
      console.log(`[Seed] Cash accounts already seeded (${existing.length} records). Skipping.`);
      return;
    }
    const seedData = [
      // ─── BIGSTOP ───────────────────────────────────────────────
      { companyId: "c-bgs", accountType: "Bank",         bankName: "Security Bank", accountName: "Security Bank - Bigstop",        accountNumber: "0000054663022",   accountHolder: "HHC Franchise Hub",        openingBalance: 0, isActive: true },
      { companyId: "c-bgs", accountType: "E-Wallet",     bankName: "GCash",         accountName: "Bigstop GCash",                  accountNumber: "09687912017",      accountHolder: "Anna Jane Herrera",        openingBalance: 0, isActive: true },
      { companyId: "c-bgs", accountType: "Cash on Hand", bankName: "",              accountName: "Cash On Hand - Bigstop",         accountNumber: "",                 accountHolder: "Bigstop",                  openingBalance: 0, isActive: true },
      // ─── HERRERA PROPERTY ─────────────────────────────────────
      { companyId: "c-hbp", accountType: "Cash on Hand", bankName: "",              accountName: "Cash On Hand - Herrera Property",accountNumber: "",                 accountHolder: "Herrera Property",         openingBalance: 0, isActive: true },
      { companyId: "c-hbp", accountType: "E-Wallet",     bankName: "GCash",         accountName: "Herrera Property GCash",         accountNumber: "09565937890",      accountHolder: "Mark Herrera",             openingBalance: 0, isActive: true },
      // ─── HHC FRANCHISE HUB ────────────────────────────────────
      { companyId: "c-frn", accountType: "Bank",         bankName: "RCBC",          accountName: "RCBC - HHC Franchise Hub",       accountNumber: "0000007591347012", accountHolder: "HHC Franchise Hub",        openingBalance: 0, isActive: true },
      { companyId: "c-frn", accountType: "Cash on Hand", bankName: "",              accountName: "Cash On Hand - HHC Franchise Hub",accountNumber: "",                accountHolder: "HHC Franchise Hub",        openingBalance: 0, isActive: true },
      // ─── BLESSCENT ────────────────────────────────────────────
      { companyId: "c-bls", accountType: "Bank",         bankName: "Security Bank", accountName: "Security Bank - Blesscent",      accountNumber: "0000075257037",    accountHolder: "Blesscent Marketing Corp", openingBalance: 0, isActive: true },
      { companyId: "c-bls", accountType: "E-Wallet",     bankName: "GCash",         accountName: "Blesscent GCash",                accountNumber: "09193305412",      accountHolder: "Mark Herrera",             openingBalance: 0, isActive: true },
      { companyId: "c-bls", accountType: "Cash on Hand", bankName: "",              accountName: "Cash On Hand - Blesscent",       accountNumber: "",                 accountHolder: "Blesscent",                openingBalance: 0, isActive: true },
      // ─── SCENTIMO ─────────────────────────────────────────────
      { companyId: "c-sct", accountType: "Bank",         bankName: "Security Bank", accountName: "Security Bank - Scentimo",       accountNumber: "0000041508572",    accountHolder: "Scentimo Manufacturing Corp", openingBalance: 0, isActive: true },
      { companyId: "c-sct", accountType: "Cash on Hand", bankName: "",              accountName: "Cash On Hand - Scentimo",        accountNumber: "",                 accountHolder: "Scentimo",                 openingBalance: 0, isActive: true },
    ];
    await db.insert(cashAccounts).values(seedData);
    console.log(`[Seed] Inserted ${seedData.length} cash accounts into SQL.`);
  } catch (err) {
    console.error("[Seed] Failed to seed cash accounts:", err);
  }
}
*/

if (!process.env.VERCEL) void startServer();
