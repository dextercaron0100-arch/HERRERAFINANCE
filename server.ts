import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Increase payload size limit since we might be sending base64 images
  app.use(express.json({ limit: '50mb' }));

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/scan-receipt", async (req, res) => {
    try {
      const { imageBase64, mimeType } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ error: "Missing imageBase64" });
      }

      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
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
      console.error(e);
      let errMsg = e.message || "Failed to parse receipt";
      if (typeof e.message === 'string' && e.message.includes('prepayment credits are depleted')) {
        errMsg = "Gemini API Error: Your prepayment credits are depleted. Please top up in AI Studio.";
      } else if (typeof e.message === 'string' && e.message.includes('{"error"')) {
        try {
          const jsonStr = e.message.substring(e.message.indexOf('{'));
          const parsedErr = JSON.parse(jsonStr);
          if (parsedErr.error?.message) errMsg = parsedErr.error.message;
        } catch (_) {}
      }
      res.status(500).json({ error: errMsg });
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

      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: promptString,
        config: {
          systemInstruction: "You are a professional financial risk analyst.",
          temperature: 0.2,
        }
      });

      res.json({ summary: response.text });
    } catch (e: any) {
      console.error(e);
      let errMsg = e.message || "Failed to assess risk";
      if (typeof e.message === 'string' && e.message.includes('prepayment credits are depleted')) {
        errMsg = "Gemini API Error: Your prepayment credits are depleted. Please top up in AI Studio.";
      } else if (typeof e.message === 'string' && e.message.includes('{"error"')) {
        try {
          const jsonStr = e.message.substring(e.message.indexOf('{'));
          const parsedErr = JSON.parse(jsonStr);
          if (parsedErr.error?.message) errMsg = parsedErr.error.message;
        } catch (_) {}
      }
      res.status(500).json({ error: errMsg });
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

      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
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
      console.error(e);
      let errMsg = e.message || "Failed to suggest category";
      if (typeof e.message === 'string' && e.message.includes('prepayment credits are depleted')) {
        errMsg = "Gemini API Error: Your prepayment credits are depleted. Please top up in AI Studio.";
      } else if (typeof e.message === 'string' && e.message.includes('{"error"')) {
        try {
          const jsonStr = e.message.substring(e.message.indexOf('{'));
          const parsedErr = JSON.parse(jsonStr);
          if (parsedErr.error?.message) errMsg = parsedErr.error.message;
        } catch (_) {}
      }
      res.status(500).json({ error: errMsg });
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

      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: promptString,
        config: {
          systemInstruction: "You are a professional Herrera Financial Intelligence Assistant. Answer concisely.",
          temperature: 0.3,
        }
      });

      res.json({ reply: response.text });
    } catch (e: any) {
      console.error(e);
      let errMsg = e.message || "Failed to get chat response";
      if (typeof e.message === 'string' && e.message.includes('prepayment credits are depleted')) {
        errMsg = "Gemini API Error: Your prepayment credits are depleted. Please top up in AI Studio.";
      } else if (typeof e.message === 'string' && e.message.startsWith('{"error"')) {
        try {
          const parsedErr = JSON.parse(e.message);
          if (parsedErr.error?.message) errMsg = parsedErr.error.message;
        } catch (_) {}
      } else if (typeof e.message === 'string' && e.message.includes('{"error"')) {
        try {
          const jsonStr = e.message.substring(e.message.indexOf('{'));
          const parsedErr = JSON.parse(jsonStr);
          if (parsedErr.error?.message) errMsg = parsedErr.error.message;
        } catch (_) {}
      }
      res.status(500).json({ error: errMsg });
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

      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: promptString,
        config: {
          systemInstruction: "You are a senior financial advisor acting as an AI assistant. Be direct, clear, and action-oriented.",
          temperature: 0.3,
        }
      });

      res.json({ explanation: response.text });
    } catch (e: any) {
      console.error(e);
      let errMsg = e.message || "Failed to generate explanation";
      if (typeof e.message === 'string' && e.message.includes('prepayment credits are depleted')) {
        errMsg = "Gemini API Error: Your prepayment credits are depleted.";
      }
      res.status(500).json({ error: errMsg });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
