import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { apiError } from "@/lib/api";
import { db } from "@/lib/db";
import { getRequestWorkspace } from "@/lib/workspace";
import { storage } from "@/lib/storage";
import { planLimits } from "@/lib/plans";
import { enqueueJob } from "@/lib/jobs";
import { processDocument } from "@/lib/document-processing";

export async function GET() {
  try {
    const workspace = await getRequestWorkspace();
    return NextResponse.json({ files: await db.fileAsset.findMany({ where: { workspaceId: workspace.id }, orderBy: { createdAt: "desc" } }) });
  } catch (error) { return apiError(error); }
}

export async function POST(request: NextRequest) {
  let assetId: string | undefined;
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "A file is required." }, { status: 400 });

    const workspace = await getRequestWorkspace();
    const subscription = await db.subscription.findUnique({ where: { workspaceId: workspace.id } });
    const limits = planLimits(subscription?.plan);
    if (file.size > limits.maxFileBytes) return NextResponse.json({ error: `Your plan supports files up to ${limits.maxFileBytes / 1024 / 1024} MB.` }, { status: 413 });
    if (await db.fileAsset.count({ where: { workspaceId: workspace.id } }) >= limits.maxFiles) return NextResponse.json({ error: "Your workspace file limit has been reached." }, { status: 402 });
    const extension = path.extname(file.name).toLowerCase();
    const allowed = [".pdf", ".docx", ".txt", ".md"];
    if (!allowed.includes(extension)) return NextResponse.json({ error: "Upload PDF, DOCX, TXT, or Markdown." }, { status: 415 });

    const storageKey = `${workspace.id}/${randomUUID()}${extension}`;
    const asset = await db.fileAsset.create({
      data: { name: path.basename(file.name), mimeType: file.type || "application/octet-stream", size: file.size, storageKey, status: "PROCESSING", workspaceId: workspace.id }
    });
    assetId = asset.id;

    await storage().put(storageKey, Buffer.from(await file.arrayBuffer()), file.type || "application/octet-stream");

    const queued = await enqueueJob("document.process", { assetId: asset.id, workspaceId: workspace.id });
    if (queued.queued) return NextResponse.json({ file: asset, jobId: queued.id }, { status: 202 });
    const processed = await processDocument(asset.id, workspace.id);
    return NextResponse.json({ file: processed.asset, chunks: processed.chunks }, { status: 201 });
  } catch (error) {
    if (assetId) await db.fileAsset.update({ where: { id: assetId }, data: { status: "FAILED" } }).catch(() => undefined);
    return apiError(error, "The file could not be processed.");
  }
}
