require("dotenv").config();

const express = require("express");
const cors = require("cors");
const fs = require("fs/promises");
const path = require("path");
const pdfParse = require("pdf-parse");
const OpenAI = require("openai");

const app = express();
const rootDir = __dirname;
const port = Number(process.env.PORT || 3000);
const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

const COURSE_MAP = {
  algebra1: {
    name: "Algebra 1",
    dir: "Algebra_1",
  },
  pkd1: {
    name: "PKD (Part 1)",
    dir: "PKD/Part1",
  },
  pkd2: {
    name: "PKD (Part 2)",
    dir: "PKD/Part2",
  },
  envarre: {
    name: "Envariabelanalys",
    dir: "Envarre",
  },
  dark: {
    name: "Datorarkitektur",
    dir: "DARK",
  },
  linalg1: {
    name: "Linjär Algebra 1",
    dir: "linjäralgebra1",
  },
  linalg2: {
    name: "Linjär Algebra 2",
    dir: "linalg2",
  },
  sysdes: {
    name: "Systemdesign med ett användarperspektiv",
    dir: "SysDes",
  },
  sanstat: {
    name: "Sannolikhet och statistik",
    dir: "sanstat",
  },
};

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.static(rootDir));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/mock-exam", async (req, res) => {
  const { courseId, exerciseType } = req.body || {};

  if (!courseId || !COURSE_MAP[courseId]) {
    return res.status(400).json({ error: "Ogiltig kurs." });
  }

  if (exerciseType !== "full") {
    return res.status(400).json({
      error: "Första backend-versionen stöder just nu bara alternativet Hel tenta.",
    });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({
      error: "OPENAI_API_KEY saknas. Lägg till den i er miljö innan ni testar AI-flödet.",
    });
  }

  try {
    const course = COURSE_MAP[courseId];
    const pdfDocs = await loadCoursePdfTexts(course.dir);

    if (!pdfDocs.length) {
      return res.status(404).json({
        error: `Hittade inga PDF-filer i ${course.dir}.`,
      });
    }

    const prompt = buildPrompt(course.name, pdfDocs);
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.responses.create({
      model,
      text: {
        format: {
          type: "json_schema",
          name: "mock_exam_payload",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              title: {
                type: "string",
              },
              examMarkdown: {
                type: "string",
              },
              answerKeyMarkdown: {
                type: "string",
              },
            },
            required: ["title", "examMarkdown", "answerKeyMarkdown"],
          },
        },
      },
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: [
                "Du är en svensk tentagenerator för universitetskurser.",
                "Skapa en helt ny mock-tenta som följer stil, svårighetsgrad och ämnesfördelning från källmaterialet utan att kopiera ordagrant.",
                "Fyll exakt det JSON-schema du har fått. Lägg inte till extra nycklar.",
              ].join(" "),
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: prompt,
            },
          ],
        },
      ],
    });

    const outputText = (response.output_text || "").trim();
    const parsed = safeJsonParse(extractJson(outputText));

    if (!parsed) {
      console.error("Kunde inte parsa AI-svar som JSON. Rått svar:");
      console.error(outputText);
      throw new Error("AI-svaret kunde inte tolkas som JSON.");
    }

    return res.json({
      title: parsed.title || `Mock-tenta i ${course.name}`,
      examMarkdown: parsed.examMarkdown || "",
      answerKeyMarkdown: parsed.answerKeyMarkdown || "",
      sourcesUsed: pdfDocs.map((doc) => doc.fileName),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Genereringen misslyckades. Kontrollera serverloggen för mer detaljer.",
    });
  }
});

app.use((error, _req, res, _next) => {
  console.error(error);

  if (res.headersSent) {
    return;
  }

  res.status(500).json({
    error: "Servern stötte på ett oväntat fel.",
  });
});

app.listen(port, () => {
  console.log(`Tenta AI-servern körs på http://localhost:${port}`);
});

async function loadCoursePdfTexts(relativeDir) {
  const courseDir = path.join(rootDir, relativeDir);
  const entries = await fs.readdir(courseDir, { withFileTypes: true });
  const pdfFiles = entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".pdf"))
    .map((entry) => entry.name)
    .sort();

  const docs = [];
  let totalChars = 0;
  const maxChars = 180000;
  const maxCharsPerPdf = 18000;

  for (const pdfFile of pdfFiles) {
    if (totalChars >= maxChars) {
      break;
    }

    const filePath = path.join(courseDir, pdfFile);
    const fileBuffer = await fs.readFile(filePath);
    const parsed = await pdfParse(fileBuffer);
    const cleanText = normalizeWhitespace(parsed.text || "");

    if (!cleanText) {
      continue;
    }

    const truncated = cleanText.slice(0, maxCharsPerPdf);
    docs.push({
      fileName: pdfFile,
      text: truncated,
    });
    totalChars += truncated.length;
  }

  return docs;
}

function buildPrompt(courseName, pdfDocs) {
  const sourceSummary = pdfDocs
    .map(
      (doc, index) =>
        `Källa ${index + 1}: ${doc.fileName}\n` +
        `Innehåll:\n${doc.text}`
    )
    .join("\n\n====================\n\n");

  return [
    `Kurs: ${courseName}`,
    "Uppgift: skapa en ny svensk mock-tenta och ett facit baserat på gamla tentor och lösningar.",
    "Krav:",
    "- Mock-tentan ska kännas realistisk och ha flera uppgifter med delmoment.",
    "- Undvik att kopiera originalfrågor ordagrant.",
    "- Facit ska visa tydliga lösningssteg och kort motivering där det behövs.",
    "- Om källmaterialet innehåller både tentor och lösningar ska du använda båda.",
    "- Returnera JSON i detta format:",
    '{ "title": "string", "examMarkdown": "string", "answerKeyMarkdown": "string" }',
    "Källmaterial:",
    sourceSummary,
  ].join("\n");
}

function normalizeWhitespace(text) {
  return text
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractJson(value) {
  const firstBrace = value.indexOf("{");
  const lastBrace = value.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return value;
  }

  return value.slice(firstBrace, lastBrace + 1);
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch (_error) {
    return null;
  }
}
