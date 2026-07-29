import { db } from "@/lib/db";
import { chunkText, createEmbeddings, extractTextBuffer } from "@/lib/documents";
import { storage } from "@/lib/storage";

export async function processDocument(assetId: string, workspaceId: string) {
  const asset = await db.fileAsset.findFirst({ where: { id: assetId, workspaceId } });
  if (!asset) throw new Error("Document job does not belong to this workspace.");
  if (asset.status === "READY") return { asset, chunks: await db.documentChunk.count({ where: { fileId: asset.id } }) };

  try {
    const bytes = await storage().get(asset.storageKey);
    const text = await extractTextBuffer(bytes, asset.name, asset.mimeType);
    const chunks = chunkText(text);
    const embeddings = await createEmbeddings(chunks);
    await db.$transaction([
      db.documentChunk.deleteMany({ where: { fileId: asset.id } }),
      ...chunks.map((content, chunkNo) => db.documentChunk.create({
        data: { fileId: asset.id, content, chunkNo, metadata: { source: asset.name }, embedding: embeddings[chunkNo] ?? undefined }
      }))
    ]);
    const ready = await db.fileAsset.update({ where: { id: asset.id }, data: { status: "READY" } });
    return { asset: ready, chunks: chunks.length };
  } catch (error) {
    await db.fileAsset.update({ where: { id: asset.id }, data: { status: "FAILED" } }).catch(() => undefined);
    throw error;
  }
}
