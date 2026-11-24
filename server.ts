import express from "express";
import path from "path";
import { spawn } from "child_process";
import fs from "fs";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON payload parser for quotation data (allow high-resolution drawing base64)
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // =========================================================================
  // API ROUTES (Always placed before Vite middleware)
  // =========================================================================

  // 1. Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", pythonSupport: false, service: "uPVC CAD Quotation Server" });
  });

  // 2. Python Vector PDF Generation Endpoint
  app.post("/api/generate-quotation-pdf", (req, res) => {
    try {
      const quotationData = req.body;
      if (!quotationData || typeof quotationData !== "object") {
        return res.status(400).json({ error: "Missing or invalid quotation data payload." });
      }

      const scriptPath = path.join(process.cwd(), "scripts", "generate_quotation_pdf.py");
      if (!fs.existsSync(scriptPath)) {
        return res.status(500).json({ error: "Python PDF generator script not found on server." });
      }

      // Spawn Python process with ReportLab generator
      const pyProcess = spawn("python3", [scriptPath, "-"]);

      const stdoutChunks: Buffer[] = [];
      const stderrChunks: Buffer[] = [];

      pyProcess.stdout.on("data", (chunk: Buffer) => {
        stdoutChunks.push(chunk);
      });

      pyProcess.stderr.on("data", (chunk: Buffer) => {
        stderrChunks.push(chunk);
      });

      pyProcess.on("close", (code) => {
        if (code !== 0) {
          const stderrMsg = Buffer.concat(stderrChunks).toString("utf-8");
          console.error(`Python PDF generator failed with code ${code}:`, stderrMsg);
          return res.status(500).json({
            error: "Python PDF generation failed.",
            details: stderrMsg,
          });
        }

        const pdfBuffer = Buffer.concat(stdoutChunks);
        const fileName = (quotationData.client?.name || "Quotation")
          .replace(/[^a-zA-Z0-9_-]/g, "_") + "_Vector_Quote.pdf";

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
        res.setHeader("Content-Length", pdfBuffer.length);
        res.send(pdfBuffer);
      });

      pyProcess.on("error", (err) => {
        console.error("Failed to spawn Python process:", err);
        res.status(500).json({ error: "Failed to execute Python process.", details: err.message });
      });

      // Write quotation JSON to Python stdin
      pyProcess.stdin.write(JSON.stringify(quotationData));
      pyProcess.stdin.end();
    } catch (err: any) {
      console.error("Error handling /api/generate-quotation-pdf:", err);
      res.status(500).json({ error: "Internal server error", details: err?.message || String(err) });
    }
  });

  // 3. Endpoint to download the standalone Python script itself
  app.get("/api/download-python-script", (_req, res) => {
    const scriptPath = path.join(process.cwd(), "scripts", "generate_quotation_pdf.py");
    if (fs.existsSync(scriptPath)) {
      res.download(scriptPath, "generate_quotation_pdf.py");
    } else {
      res.status(404).json({ error: "Script not found." });
    }
  });

  // =========================================================================
  // VITE MIDDLEWARE (Development) & STATIC ASSETS (Production)
  // =========================================================================
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`uPVC CAD Full-Stack Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
