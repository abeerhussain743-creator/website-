import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGO = "aes-256-gcm";
const IV_LENGTH = 12;

function keyFromEnv(raw: string): Buffer {
  const buf = Buffer.from(raw, "base64");
  if (buf.length !== 32) {
    throw new Error(
      "TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key (openssl rand -base64 32)",
    );
  }
  return buf;
}

export type EncryptedPayload = {
  ciphertext: string;
  iv: string;
  authTag: string;
  keyVersion: number;
};

export function encryptSecret(
  plaintext: string,
  keyBase64: string,
  keyVersion = 1,
): EncryptedPayload {
  const key = keyFromEnv(keyBase64);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  return {
    ciphertext: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
    keyVersion,
  };
}

export function decryptSecret(
  payload: EncryptedPayload,
  keyBase64: string,
): string {
  const key = keyFromEnv(keyBase64);
  const decipher = createDecipheriv(
    ALGO,
    key,
    Buffer.from(payload.iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(payload.authTag, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, "base64")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}
