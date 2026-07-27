import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getRequestWorkspace } from "@/lib/workspace";
import { createEmbeddings, cosineSimilarity } from "@/lib/documents";

const requestSchema = z.object({ message: z.string().trim().min(1).max(4000) });

export async function POST(request: NextRequest) {
  const result = requestSchema.safeParse(await request.json());
  if (!result.success) return NextResponse.json({ error: "A valid message is required." }, { status: 400 });

  const workspace = await getRequestWorkspace();
  const chunks = await db.documentChunk.findMany({
    where: { file: { workspaceId: workspace.id } },
    include: { file: true },
    take: 100
  });
  let ranked = chunks
    .map((chunk) => ({ chunk, score: chunk.content.toLowerCase().includes(result.data.message.toLowerCase()) ? 1 : 0 }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  if (process.env.OPENAI_API_KEY && chunks.some((chunk) => Array.isArray(chunk.embedding))) {
    const [queryEmbedding] = await createEmbeddings([result.data.message]);
    if (queryEmbedding) ranked = chunks
      .map((chunk) => ({ chunk, score: Array.isArray(chunk.embedding) ? cosineSimilarity(queryEmbedding, chunk.embedding as number[]) : 0 }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);
  }
  const sources = ranked.filter((item) => item.score > 0).map((item, index) => ({
    id: index + 1,
    file: item.chunk.file.name,
    section: item.chunk.chunkNo + 1,
    content: item.chunk.content
  }));

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({
      message: sources.length
        ? `I found relevant material in ${sources.map((source) => `${source.file} (section ${source.section})`).join(", ")}. Add OPENAI_API_KEY to synthesize a cited answer.`
        : `I’d help with “${result.data.message}” using your connected workspace. Add OPENAI_API_KEY to activate live AI responses.`,
      citations: sources.map((source) => ({ id: source.id, file: source.file, section: source.section }))
    });
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.responses.create({
    model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
    instructions: "You are Orbit, a concise productivity assistant. Answer only from supplied sources when they exist. Cite sources inline as [1], [2]. Never invent citations.",
    input: `${result.data.message}\n\nSources:\n${sources.map((source) => `[${source.id}] ${source.file}, section ${source.section}\n${source.content}`).join("\n\n")}`
  });
  return NextResponse.json({
    message: response.output_text,
    citations: sources.map((source) => ({ id: source.id, file: source.file, section: source.section }))
  });
}
