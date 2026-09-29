import { z } from "zod";
import {
  PutObjectCommand,
  S3Client,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export const storageConfigSchema = z.object({
  endpoint: z.string().optional(),
  region: z.string().default("auto"),
  bucket: z.string().min(1),
  accessKeyId: z.string().min(1).optional(),
  secretAccessKey: z.string().min(1).optional(),
  forcePathStyle: z.boolean().default(true),
  publicUrl: z.string().optional(),
  driver: z.enum(["s3", "local"]).default("s3"),
  localRoot: z.string().default("./uploads"),
});

export type StorageConfig = z.infer<typeof storageConfigSchema>;

export interface ObjectStorage {
  putObject(input: {
    key?: string;
    body: Buffer | Uint8Array;
    contentType: string;
    prefix?: string;
  }): Promise<{ key: string; url: string }>;
  getSignedDownloadUrl(key: string, expiresInSeconds?: number): Promise<string>;
  publicUrlFor(key: string): string;
}

export function createLocalStorage(raw: {
  localRoot?: string;
  publicUrl?: string;
}): ObjectStorage {
  const root = path.resolve(raw.localRoot ?? "./uploads");
  const publicBase = (raw.publicUrl ?? "/media").replace(/\/$/, "");

  return {
    publicUrlFor(key: string) {
      return `${publicBase}/${key}`;
    },
    async putObject({ key, body, contentType, prefix = "uploads" }) {
      const objectKey = key ?? `${prefix}/${randomUUID()}`;
      const fullPath = path.join(root, objectKey);
      await mkdir(path.dirname(fullPath), { recursive: true });
      await writeFile(fullPath, body);
      void contentType;
      return { key: objectKey, url: this.publicUrlFor(objectKey) };
    },
    async getSignedDownloadUrl(key) {
      return this.publicUrlFor(key);
    },
  };
}

export function createS3Storage(raw: StorageConfig): ObjectStorage {
  const config = storageConfigSchema.parse(raw);
  if (!config.accessKeyId || !config.secretAccessKey) {
    throw new Error("S3 credentials required for s3 driver");
  }
  const client = new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    forcePathStyle: config.forcePathStyle,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  function publicUrlFor(key: string): string {
    if (config.publicUrl) {
      return `${config.publicUrl.replace(/\/$/, "")}/${key}`;
    }
    if (config.endpoint) {
      return `${config.endpoint.replace(/\/$/, "")}/${config.bucket}/${key}`;
    }
    return `https://${config.bucket}.s3.${config.region}.amazonaws.com/${key}`;
  }

  return {
    publicUrlFor,
    async putObject({ key, body, contentType, prefix = "uploads" }) {
      const objectKey = key ?? `${prefix}/${randomUUID()}`;
      await client.send(
        new PutObjectCommand({
          Bucket: config.bucket,
          Key: objectKey,
          Body: body,
          ContentType: contentType,
        }),
      );
      return { key: objectKey, url: publicUrlFor(objectKey) };
    },
    async getSignedDownloadUrl(key, expiresInSeconds = 3600) {
      return getSignedUrl(
        client,
        new GetObjectCommand({ Bucket: config.bucket, Key: key }),
        { expiresIn: expiresInSeconds },
      );
    },
  };
}

export function storageFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): ObjectStorage {
  const driver =
    env.STORAGE_DRIVER === "local" || !env.S3_ACCESS_KEY_ID
      ? "local"
      : "s3";

  if (driver === "local") {
    return createLocalStorage({
      localRoot: env.STORAGE_LOCAL_ROOT ?? "./uploads",
      publicUrl: env.S3_PUBLIC_URL ?? "http://localhost:3000/media",
    });
  }

  return createS3Storage(
    storageConfigSchema.parse({
      endpoint: env.S3_ENDPOINT,
      region: env.S3_REGION ?? "auto",
      bucket: env.S3_BUCKET ?? "postpilot",
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
      forcePathStyle: env.S3_FORCE_PATH_STYLE !== "false",
      publicUrl: env.S3_PUBLIC_URL,
      driver: "s3",
    }),
  );
}
