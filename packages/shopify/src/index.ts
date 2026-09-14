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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
