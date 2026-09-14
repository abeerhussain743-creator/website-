import { mkdir, writeFile, readFile, access } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";

export type StoredObject = {
  key: string;
  sizeBytes: number;
  contentType: string;
  backend: "local" | "s3";
};

function storageRoot(): string {
  return process.env.STORAGE_ROOT ?? path.join(process.cwd(), ".data", "storage");
}

function useS3(): boolean {
  return Boolean(process.env.S3_ENDPOINT && process.env.S3_BUCKET);
}

function s3Client(): S3Client {
  return new S3Client({
    region: process.env.S3_REGION ?? "us-east-1",
    endpoint: process.env.S3_ENDPOINT,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== "false",
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "minioadmin",
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "minioadmin",
    },
  });
}

export function buildStorageKey(parts: {
  organizationId: string;
  kind: string;
  filename: string;
}): string {
  const safeName = parts.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${parts.organizationId}/${parts.kind}/${Date.now()}-${randomUUID().slice(0, 8)}-${safeName}`;
}

export async function putObject(params: {
  key: string;
  body: Buffer | string;
  contentType: string;
}): Promise<StoredObject> {
  const body = Buffer.isBuffer(params.body)
    ? params.body
    : Buffer.from(params.body, "utf8");

  if (useS3()) {
    const client = s3Client();
    await client.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET!,
        Key: params.key,
        Body: body,
        ContentType: params.contentType,
      }),
    );
    return {
      key: params.key,
      sizeBytes: body.byteLength,
      contentType: params.contentType,
      backend: "s3",
    };
  }

  const fullPath = path.join(storageRoot(), params.key);
  await mkdir(path.dirname(fullPath), { recursive: true });
  await writeFile(fullPath, body);
  return {
    key: params.key,
    sizeBytes: body.byteLength,
    contentType: params.contentType,
    backend: "local",
  };
}

export async function getObject(key: string): Promise<Buffer> {
  if (useS3()) {
    const client = s3Client();
    const res = await client.send(
      new GetObjectCommand({
        Bucket: process.env.S3_BUCKET!,
        Key: key,
      }),
    );
    const bytes = await res.Body?.transformToByteArray();
    if (!bytes) throw new Error(`Empty S3 object: ${key}`);
    return Buffer.from(bytes);
  }

  const fullPath = path.join(storageRoot(), key);
  await access(fullPath);
  return readFile(fullPath);
}

export async function getObjectText(key: string): Promise<string> {
  return (await getObject(key)).toString("utf8");
}
