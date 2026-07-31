import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
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

  app.use(express.json());

  app.post("/api/ai-search", async (req, res) => {
    try {
      const { query } = req.body;
      if (!query) {
        return res.status(400).json({ error: "Query is required" });
      }

      // We'll use streaming for a better UI experience
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();

      const response = await ai.models.generateContentStream({
        model: "gemini-3.1-pro-preview",
        contents: `You are an AI assistant built into StudyQuake, an educational portal for Indian competitive exams like RPSC, RSMSSB, SSC, and UPSC.
Answer the following query thoughtfully and provide deep educational insights, notes, or tips where relevant.
Query: ${query}`,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
          // Note: maxOutputTokens must not be set when using thinking mode.
        },
      });

      for await (const chunk of response) {
        if (chunk.text) {
          res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
        }
      }
      res.write('data: [DONE]\n\n');
      res.end();
    } catch (error) {
      console.error("AI Search Error:", error);
      res.write(`data: ${JSON.stringify({ error: "Failed to generate response." })}\n\n`);
      res.end();
    }
  });

  app.get("/rss.xml", async (req, res) => {
    try {
      const projectId = "gen-lang-client-0684119223";
      const dbId = "ai-studio-plusuiclone-87f7d9a4-167e-42ce-a8c5-1ad72f8ca775";
      const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${dbId}/documents/posts`;
      const response = await fetch(url);
      const data = await response.json();
      
      const posts = (data.documents || []).map((doc: any) => {
        const fields = doc.fields || {};
        return {
          id: doc.name.split('/').pop(),
          title: fields.title?.stringValue || '',
          snippet: fields.snippet?.stringValue || '',
          date: fields.date?.stringValue || '',
          createdAt: fields.createdAt?.timestampValue || new Date().toISOString(),
          status: fields.status?.stringValue || 'published',
        };
      });

      const { generateRSS } = await import("./src/lib/rss");
      const rss = generateRSS(posts);
      
      res.setHeader("Content-Type", "application/rss+xml");
      res.send(rss);
    } catch (e) {
      console.error("RSS generation error:", e);
      res.status(500).send("Error generating RSS feed");
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
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
