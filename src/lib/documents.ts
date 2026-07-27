import OpenAI from "openai";

export function chunkText(text: string, size = 1200, overlap = 160) {
  const clean = text.replace(/\s+/g, " ").trim();
  const chunks: string[] = [];
  for (let start = 0; start < clean.length; start += size - overlap) {
    chunks.push(clean.slice(start, start + size));
    if (start + size >= clean.length) break;
  }
  return chunks;
}

export async function extractText(file: File) {
  const bytes = Buffer.from(await file.arrayBuffer());
  if (file.type === "text/plain" || file.name.endsWith(".txt") || file.name.endsWith(".md")) return bytes.toString("utf8");
  if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
    const pdf = (await import("pdf-parse")).default;
    return (await pdf(bytes)).text;
  }
  if (file.name.endsWith(".docx") || file.type.includes("wordprocessingml")) {
    const mammoth = await import("mammoth");
    return (await mammoth.extractRawText({ buffer: bytes })).value;
  }
  throw new Error("Unsupported file type. Upload PDF, DOCX, TXT, or Markdown.");
}

export async function createEmbeddings(inputs: string[]) {
  if (!process.env.OPENAI_API_KEY || inputs.length === 0) return inputs.map(() => null);
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const result = await openai.embeddings.create({
    model: process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small",
    input: inputs
  });
  return result.data.map((item) => item.embedding);
}

export function cosineSimilarity(a: number[], b: number[]) {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let index = 0; index < a.length; index++) {
    dot += a[index] * b[index];
    normA += a[index] ** 2;
    normB += b[index] ** 2;
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) || 1);
}
