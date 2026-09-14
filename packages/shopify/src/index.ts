import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { AppError } from "@shopdata/shared";

const ALGO = "aes-256-gcm";

function getKey(): Buffer {
  const hex = process.env.TOKEN_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new AppError(
      "TOKEN_ENCRYPTION_KEY must be a 64-char hex string (32 bytes)",
      "CONFIG_ERROR",
      500,
    );
  }
  return Buffer.from(hex, "hex");
}

/** Encrypt Shopify access tokens at rest (AES-256-GCM). */
export function encryptToken(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, getKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptToken(payload: string): string {
  const [ivHex, tagHex, dataHex] = payload.split(":");
  if (!ivHex || !tagHex || !dataHex) {
    throw new AppError("Invalid encrypted token payload", "DECRYPT_ERROR", 500);
  }
  const decipher = createDecipheriv(ALGO, getKey(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataHex, "hex")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

export function verifyShopifyWebhookHmac(
  rawBody: Buffer,
  hmacHeader: string | null,
  secret: string,
): boolean {
  if (!hmacHeader) return false;
  const digest = createHmac("sha256", secret)
    .update(rawBody)
    .digest("base64");
  const a = Buffer.from(digest);
  const b = Buffer.from(hmacHeader);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function buildInstallUrl(params: {
  shop: string;
  apiKey: string;
  scopes: string;
  redirectUri: string;
  state: string;
}): string {
  const shop = normalizeShopDomain(params.shop);
  const url = new URL(`https://${shop}/admin/oauth/authorize`);
  url.searchParams.set("client_id", params.apiKey);
  url.searchParams.set("scope", params.scopes);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("state", params.state);
  return url.toString();
}

export function normalizeShopDomain(shop: string): string {
  const cleaned = shop
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");
  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(cleaned)) {
    throw new AppError(
      "Shop must be a valid *.myshopify.com domain",
      "INVALID_SHOP",
      400,
    );
  }
  return cleaned;
}

export interface ShopifyTokenResponse {
  access_token: string;
  scope: string;
}

export async function exchangeOAuthCode(params: {
  shop: string;
  code: string;
  apiKey: string;
  apiSecret: string;
}): Promise<ShopifyTokenResponse> {
  const shop = normalizeShopDomain(params.shop);
  const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: params.apiKey,
      client_secret: params.apiSecret,
      code: params.code,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new AppError(
      `Shopify OAuth token exchange failed: ${text}`,
      "OAUTH_EXCHANGE_FAILED",
      502,
    );
  }

  return (await res.json()) as ShopifyTokenResponse;
}

export interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
  extensions?: { cost?: { throttleStatus?: { currentlyAvailable: number } } };
}

export class ShopifyGraphQLClient {
  constructor(
    private readonly shop: string,
    private readonly accessToken: string,
    private readonly apiVersion = process.env.SHOPIFY_API_VERSION ?? "2025-01",
  ) {}

  async request<T>(
    query: string,
    variables?: Record<string, unknown>,
  ): Promise<T> {
    const shop = normalizeShopDomain(this.shop);
    const url = `https://${shop}/admin/api/${this.apiVersion}/graphql.json`;

    let attempt = 0;
    while (attempt < 5) {
      attempt += 1;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": this.accessToken,
        },
        body: JSON.stringify({ query, variables }),
      });

      if (res.status === 429) {
        await sleep(2 ** attempt * 250);
        continue;
      }

      if (!res.ok) {
        throw new AppError(
          `Shopify GraphQL HTTP ${res.status}`,
          "SHOPIFY_HTTP_ERROR",
          502,
        );
      }

      const json = (await res.json()) as GraphQLResponse<T>;
      if (json.errors?.length) {
        const throttled = json.errors.some((e) =>
          /throttl/i.test(e.message),
        );
        if (throttled && attempt < 5) {
          await sleep(2 ** attempt * 250);
          continue;
        }
        throw new AppError(
          json.errors.map((e) => e.message).join("; "),
          "SHOPIFY_GRAPHQL_ERROR",
          502,
          json.errors,
        );
      }

      if (!json.data) {
        throw new AppError("Empty Shopify GraphQL response", "SHOPIFY_EMPTY", 502);
      }

      return json.data;
    }

    throw new AppError("Shopify GraphQL retries exhausted", "SHOPIFY_RETRY", 502);
  }
}

export const SHOP_QUERY = `#graphql
  query ShopDataShop {
    shop {
      name
      email
      currencyCode
      ianaTimezone
      plan {
        displayName
      }
      myshopifyDomain
    }
  }
`;

export const BULK_OPERATION_RUN_QUERY = `#graphql
  mutation BulkOperationRunQuery($query: String!) {
    bulkOperationRunQuery(query: $query) {
      bulkOperation {
        id
        status
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const CURRENT_BULK_OPERATION = `#graphql
  query CurrentBulkOperation {
    currentBulkOperation {
      id
      status
      errorCode
      createdAt
      completedAt
      objectCount
      fileSize
      url
      partialDataUrl
    }
  }
`;

export const PRODUCTS_BULK_EXPORT_QUERY = `
{
  products {
    edges {
      node {
        id
        handle
        title
        status
        vendor
        productType
        tags
        descriptionHtml
        seo {
          title
          description
        }
        variants {
          edges {
            node {
              id
              sku
              price
              compareAtPrice
              barcode
              inventoryQuantity
            }
          }
        }
      }
    }
  }
}
`;

export const STAGED_UPLOADS_CREATE = `#graphql
  mutation StagedUploadsCreate($input: [StagedUploadInput!]!) {
    stagedUploadsCreate(input: $input) {
      stagedTargets {
        url
        resourceUrl
        parameters {
          name
          value
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const BULK_OPERATION_RUN_MUTATION = `#graphql
  mutation BulkOperationRunMutation($mutation: String!, $stagedUploadPath: String!) {
    bulkOperationRunMutation(mutation: $mutation, stagedUploadPath: $stagedUploadPath) {
      bulkOperation {
        id
        status
      }
      userErrors {
        field
        message
      }
    }
  }
`;

/** Product set mutation used by bulk imports. */
export const PRODUCT_SET_BULK_MUTATION = `
mutation productSet($input: ProductSetInput!) {
  productSet(input: $input) {
    product {
      id
      handle
    }
    userErrors {
      field
      message
      code
    }
  }
}
`;

export type StagedUploadTarget = {
  url: string;
  resourceUrl?: string | null;
  parameters: Array<{ name: string; value: string }>;
};

export async function createStagedUpload(
  client: ShopifyGraphQLClient,
  filename = "bulk-mutations.jsonl",
): Promise<StagedUploadTarget> {
  const data = await client.request<{
    stagedUploadsCreate: {
      stagedTargets: StagedUploadTarget[];
      userErrors: Array<{ message: string }>;
    };
  }>(STAGED_UPLOADS_CREATE, {
    input: [
      {
        resource: "BULK_MUTATION_VARIABLES",
        filename,
        mimeType: "text/jsonl",
        httpMethod: "POST",
      },
    ],
  });

  if (data.stagedUploadsCreate.userErrors.length) {
    throw new AppError(
      data.stagedUploadsCreate.userErrors.map((e) => e.message).join("; "),
      "STAGED_UPLOAD_ERROR",
      502,
    );
  }

  const target = data.stagedUploadsCreate.stagedTargets[0];
  if (!target) {
    throw new AppError("No staged upload target returned", "STAGED_UPLOAD_EMPTY", 502);
  }
  return target;
}

export async function uploadToStagedTarget(
  target: StagedUploadTarget,
  body: string | Buffer,
): Promise<string> {
  const form = new FormData();
  for (const param of target.parameters) {
    form.append(param.name, param.value);
  }
  const bytes =
    typeof body === "string" ? body : new Uint8Array(body);
  const blob = new Blob([bytes], { type: "text/jsonl" });
  form.append("file", blob, "bulk-mutations.jsonl");

  const res = await fetch(target.url, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new AppError(
      `Staged upload failed (${res.status}): ${text}`,
      "STAGED_UPLOAD_HTTP",
      502,
    );
  }

  const keyParam = target.parameters.find((p) => p.name === "key");
  if (!keyParam?.value) {
    throw new AppError("Staged upload missing key parameter", "STAGED_UPLOAD_KEY", 502);
  }
  return keyParam.value;
}

export async function runBulkMutation(
  client: ShopifyGraphQLClient,
  stagedUploadPath: string,
  mutation = PRODUCT_SET_BULK_MUTATION,
): Promise<{ id: string; status: string }> {
  const data = await client.request<{
    bulkOperationRunMutation: {
      bulkOperation: { id: string; status: string } | null;
      userErrors: Array<{ message: string }>;
    };
  }>(BULK_OPERATION_RUN_MUTATION, {
    mutation,
    stagedUploadPath,
  });

  if (data.bulkOperationRunMutation.userErrors.length) {
    throw new AppError(
      data.bulkOperationRunMutation.userErrors.map((e) => e.message).join("; "),
      "BULK_MUTATION_ERROR",
      502,
    );
  }

  const op = data.bulkOperationRunMutation.bulkOperation;
  if (!op) {
    throw new AppError("No bulk operation returned", "BULK_MUTATION_EMPTY", 502);
  }
  return op;
}

export type BulkOperationStatus = {
  id: string;
  status: string;
  errorCode?: string | null;
  objectCount?: string | null;
  url?: string | null;
  partialDataUrl?: string | null;
};

export async function pollBulkOperation(
  client: ShopifyGraphQLClient,
  options?: {
    maxAttempts?: number;
    intervalMs?: number;
    shouldCancel?: () => Promise<boolean>;
    onProgress?: (attempt: number, op: BulkOperationStatus | null) => Promise<void>;
  },
): Promise<BulkOperationStatus> {
  const maxAttempts = options?.maxAttempts ?? 90;
  const intervalMs = options?.intervalMs ?? 2000;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (options?.shouldCancel && (await options.shouldCancel())) {
      throw new AppError("Bulk operation cancelled", "BULK_CANCELLED", 409);
    }

    const data = await client.request<{
      currentBulkOperation: BulkOperationStatus | null;
    }>(CURRENT_BULK_OPERATION);

    const op = data.currentBulkOperation;
    if (options?.onProgress) {
      await options.onProgress(attempt, op);
    }

    if (!op) {
      await sleep(intervalMs);
      continue;
    }

    if (op.status === "COMPLETED") return op;
    if (op.status === "FAILED" || op.status === "CANCELED") {
      throw new AppError(
        `Bulk operation ${op.status}${op.errorCode ? `: ${op.errorCode}` : ""}`,
        "BULK_FAILED",
        502,
        op,
      );
    }

    await sleep(intervalMs);
  }

  throw new AppError("Bulk operation poll timeout", "BULK_TIMEOUT", 504);
}

export async function downloadText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new AppError(`Failed to download ${url} (${res.status})`, "DOWNLOAD_FAILED", 502);
  }
  return res.text();
}

export type BulkMutationResultLine = {
  data?: {
    productSet?: {
      product?: { id?: string; handle?: string } | null;
      userErrors?: Array<{ field?: string[] | null; message: string; code?: string }>;
    };
  };
  errors?: Array<{ message: string }>;
};

export function parseBulkMutationResults(jsonl: string): Array<{
  index: number;
  success: boolean;
  productId?: string;
  handle?: string;
  errors: string[];
}> {
  const results: Array<{
    index: number;
    success: boolean;
    productId?: string;
    handle?: string;
    errors: string[];
  }> = [];

  jsonl.split("\n").forEach((line, index) => {
    if (!line.trim()) return;
    const parsed = JSON.parse(line) as BulkMutationResultLine;
    const productSet = parsed.data?.productSet;
    const userErrors = productSet?.userErrors ?? [];
    const topErrors = parsed.errors ?? [];
    const errors = [
      ...userErrors.map((e) => e.message),
      ...topErrors.map((e) => e.message),
    ];
    results.push({
      index,
      success: errors.length === 0 && Boolean(productSet?.product?.id),
      productId: productSet?.product?.id,
      handle: productSet?.product?.handle,
      errors,
    });
  });

  return results;
}

/** True when we should skip live Shopify writes (demo token / explicit dry-run). */
export function shouldDryRunShopifyWrites(accessToken: string): boolean {
  if (process.env.SHOPDATA_DRY_RUN === "true") return true;
  return /demo|not_a_real|placeholder/i.test(accessToken);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
