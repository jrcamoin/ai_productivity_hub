import { describe, expect, it } from "vitest";
import { chunkText, cosineSimilarity, extractTextBuffer } from "./documents";

describe("document utilities", () => {
  it("chunks with overlap without losing the ending", () => {
    const text = "a".repeat(3000);
    const chunks = chunkText(text, 1000, 100);
    expect(chunks.length).toBe(4);
    expect(chunks.at(-1)).toBe("a".repeat(300));
  });
  it("ranks identical vectors above unrelated vectors", () => {
    expect(cosineSimilarity([1, 0], [1, 0])).toBeGreaterThan(cosineSimilarity([1, 0], [0, 1]));
  });
  it("extracts UTF-8 text from worker buffers", async () => {
    await expect(extractTextBuffer(Buffer.from("worker text"), "notes.md", "text/markdown")).resolves.toBe("worker text");
  });
});
