import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@shopdata/db";
import {
  exchangeOAuthCode,
  encryptToken,
  normalizeShopDomain,
  ShopifyGraphQLClient,
  SHOP_QUERY,
} from "@shopdata/shopify";

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const shopParam = url.searchParams.get("shop");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expectedState = req.cookies.get("shopdata_oauth_state")?.value;
  const expectedShop = req.cookies.get("shopdata_oauth_shop")?.value;

  if (!shopParam || !code || !state || !expectedState || state !== expectedState) {
    return NextResponse.json({ error: "Invalid OAuth state" }, { status: 400 });
  }

  const apiKey = process.env.SHOPIFY_API_KEY;
  const apiSecret = process.env.SHOPIFY_API_SECRET;
  if (!apiKey || !apiSecret) {
    return NextResponse.json({ error: "Shopify credentials missing" }, { status: 503 });
  }

  try {
    const shop = normalizeShopDomain(shopParam);
    if (expectedShop && expectedShop !== shop) {
      return NextResponse.json({ error: "Shop mismatch" }, { status: 400 });
    }

    const token = await exchangeOAuthCode({
      shop,
      code,
      apiKey,
      apiSecret,
    });

    const client = new ShopifyGraphQLClient(shop, token.access_token);
    const shopData = await client.request<{
      shop: {
        name: string;
        currencyCode: string;
        ianaTimezone: string;
        plan: { displayName: string };
      };
    }>(SHOP_QUERY);

    const orgSlug = shop.replace(".myshopify.com", "");
    const organization = await prisma.organization.upsert({
      where: { slug: orgSlug },
      create: {
        name: shopData.shop.name || orgSlug,
        slug: orgSlug,
      },
      update: { name: shopData.shop.name || orgSlug },
    });

    const freePlan = await prisma.plan.findUnique({ where: { code: "FREE" } });
    if (freePlan) {
      await prisma.subscription.upsert({
        where: { organizationId: organization.id },
        create: {
          organizationId: organization.id,
          planId: freePlan.id,
          status: "TRIALING",
        },
        update: {},
      });
    }

    const store = await prisma.store.upsert({
      where: { shopDomain: shop },
      create: {
        organizationId: organization.id,
        shopDomain: shop,
        name: shopData.shop.name,
        currency: shopData.shop.currencyCode,
        timezone: shopData.shop.ianaTimezone,
        planDisplayName: shopData.shop.plan.displayName,
        isActive: true,
        uninstalledAt: null,
      },
      update: {
        name: shopData.shop.name,
        currency: shopData.shop.currencyCode,
        timezone: shopData.shop.ianaTimezone,
        planDisplayName: shopData.shop.plan.displayName,
        isActive: true,
        uninstalledAt: null,
      },
    });

    await prisma.shopifyConnection.upsert({
      where: { storeId: store.id },
      create: {
        storeId: store.id,
        accessTokenEncrypted: encryptToken(token.access_token),
        scope: token.scope,
        lastVerifiedAt: new Date(),
      },
      update: {
        accessTokenEncrypted: encryptToken(token.access_token),
        scope: token.scope,
        lastVerifiedAt: new Date(),
      },
    });

    await prisma.auditLog.create({
      data: {
        organizationId: organization.id,
        storeId: store.id,
        action: "store.connected",
        resourceType: "store",
        resourceId: store.id,
        metadata: { shop, scope: token.scope },
      },
    });

    const response = NextResponse.redirect(new URL("/app/stores", req.url));
    response.cookies.delete("shopdata_oauth_state");
    response.cookies.delete("shopdata_oauth_shop");
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "OAuth failed" },
      { status: 500 },
    );
  }
}
