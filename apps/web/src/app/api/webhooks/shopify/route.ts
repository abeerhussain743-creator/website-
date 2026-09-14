import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@shopdata/db";
import { verifyShopifyWebhookHmac } from "@shopdata/shopify";

export async function POST(req: NextRequest) {
  const secret = process.env.SHOPIFY_API_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const rawBody = Buffer.from(await req.arrayBuffer());
  const hmac = req.headers.get("x-shopify-hmac-sha256");
  if (!verifyShopifyWebhookHmac(rawBody, hmac, secret)) {
    return NextResponse.json({ error: "Invalid HMAC" }, { status: 401 });
  }

  const topic = req.headers.get("x-shopify-topic");
  const shop = req.headers.get("x-shopify-shop-domain");

  if (topic === "app/uninstalled" && shop) {
    const store = await prisma.store.findUnique({ where: { shopDomain: shop } });
    if (store) {
      await prisma.store.update({
        where: { id: store.id },
        data: { isActive: false, uninstalledAt: new Date() },
      });
      await prisma.shopifyConnection.deleteMany({ where: { storeId: store.id } });
      await prisma.auditLog.create({
        data: {
          organizationId: store.organizationId,
          storeId: store.id,
          action: "store.uninstalled",
          resourceType: "store",
          resourceId: store.id,
        },
      });
    }
  }

  return NextResponse.json({ ok: true });
}
