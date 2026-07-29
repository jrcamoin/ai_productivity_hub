import { mkdir, readFile, unlink } from "node:fs/promises";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

export interface ObjectStorage {
  put(key: string, data: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<Buffer>;
  remove(key: string): Promise<void>;
}

class LocalStorage implements ObjectStorage {
  private root = path.resolve(process.env.LOCAL_UPLOAD_DIR ?? "./uploads");
  async put(key: string, data: Buffer) {
    const destination = path.join(this.root, key);
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, data, { flag: "wx" });
  }
  async get(key: string) { return readFile(path.join(this.root, key)); }
  async remove(key: string) {
    await unlink(path.join(this.root, key)).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") throw error;
    });
  }
}

class S3Storage implements ObjectStorage {
  private bucket = process.env.S3_BUCKET!;
  private client = new S3Client({
    region: process.env.S3_REGION ?? "auto",
    endpoint: process.env.S3_ENDPOINT,
    forcePathStyle: Boolean(process.env.S3_ENDPOINT),
    credentials: process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY
      ? { accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY }
      : undefined
  });
  async put(key: string, data: Buffer, contentType: string) {
    await this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: data, ContentType: contentType }));
  }
  async get(key: string) {
    const response = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    return Buffer.from(await response.Body!.transformToByteArray());
  }
  async remove(key: string) {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}

export function storage(): ObjectStorage {
  return process.env.S3_BUCKET ? new S3Storage() : new LocalStorage();
}
