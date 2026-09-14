import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { buildInstallUrl, normalizeShopDomain } from "@shopdata/shopify";

export async function GET(req: NextRequest) {
  const shopParam = req.nextUrl.searchParams.get("shop");
  if (!shopParam) {
    return NextResponse.json({ error: "Missing shop" }, { status: 400 });
  }

  const apiKey = process.env.SHOPIFY_API_KEY;
  const scopes = process.env.SHOPIFY_SCOPES ?? "read_products,write_products";
  const appUrl = process.env.SHOPIFY_APP_URL ?? process.env.NEXT_PUBLIC_APP_URL;

  if (!apiKey || !appUrl) {
    return NextResponse.json(
      {
        error:
          "Shopify OAuth is not configured. Set SHOPIFY_API_KEY, SHOPIFY_API_SECRET, and SHOPIFY_APP_URL.",
      },
      { status: 503 },
    );
  }

  try {
    const shop = normalizeShopDomain(shopParam);
    const state = randomBytes(16).toString("hex");
    const redirectUri = `${appUrl.replace(/\/$/, "")}/api/auth/shopify/callback`;
    const url = buildInstallUrl({
      shop,
      apiKey,
      scopes,
      redirectUri,
      state,
    });

    const response = NextResponse.redirect(url);
    response.cookies.set("shopdata_oauth_state", state, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 600,
    });
    response.cookies.set("shopdata_oauth_shop", shop, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 600,
    });
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid shop" },
      { status: 400 },
    );
  }
}
