import { createHash } from "node:crypto";

export type ImageGenerateInput = {
  prompt: string;
  width?: number;
  height?: number;
  brandColors?: string[];
};

export type ImageGenerateResult = {
  /** data URL or remote URL */
  url: string;
  provider: string;
  prompt: string;
  /** SVG markup used when fal/replicate keys are absent */
  svg?: string;
};

/**
 * Image generation adapter. With FAL_KEY/REPLICATE_API_TOKEN would call remotes;
 * demo mode returns a deterministic branded SVG data URL.
 */
export async function generateImage(
  input: ImageGenerateInput,
): Promise<ImageGenerateResult> {
  if (process.env.FAL_KEY || process.env.REPLICATE_API_TOKEN) {
    // Live providers require paid accounts — keep interface ready, use demo render.
  }

  const w = input.width ?? 1080;
  const h = input.height ?? 1350;
  const colors = input.brandColors?.length
    ? input.brandColors
    : ["#0F3D3E", "#E8D5B7", "#D97706"];
  const hash = createHash("sha256").update(input.prompt).digest("hex").slice(0, 8);
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${colors[0]}"/>
      <stop offset="100%" stop-color="${colors[1] ?? colors[0]}"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#g)"/>
  <circle cx="${w * 0.8}" cy="${h * 0.2}" r="${w * 0.25}" fill="${colors[2] ?? "#D97706"}" opacity="0.35"/>
  <text x="72" y="${h * 0.72}" fill="#FAF7F2" font-family="Georgia, serif" font-size="42">${escapeXml(input.prompt.slice(0, 48))}</text>
  <text x="72" y="${h * 0.78}" fill="#FAF7F2" opacity="0.7" font-family="system-ui" font-size="22">demo imagery · ${hash}</text>
</svg>`;
  const url = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
  return {
    url,
    provider: "demo-svg",
    prompt: input.prompt,
    svg,
  };
}

function escapeXml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
