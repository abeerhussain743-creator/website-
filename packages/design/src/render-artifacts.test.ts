import { describe, expect, it } from "vitest";
import { renderPostPng } from "./render.js";
import { writeFile, mkdir } from "node:fs/promises";

describe("design artifacts", () => {
  it("writes premium template samples", async () => {
    await mkdir("/opt/cursor/artifacts/screenshots", { recursive: true });
    const brandKit = {
      primaryColor: "#0F3D3E",
      secondaryColor: "#E8D5B7",
      accentColor: "#D97706",
      backgroundColor: "#FAF7F2",
      textColor: "#14212B",
    };
    const content = {
      businessName: "Lumen Café",
      headline: "Start with the ritual, not the hustle.",
      body: "A calm pour-over beats a chaotic morning.",
      cta: "Save this ritual",
      badge: "Specialty coffee",
      statValue: "4m",
      statLabel: "to a better morning",
    };
    for (const family of ["bold", "luxury", "quote", "stat", "tip"] as const) {
      const out = await renderPostPng({
        family,
        size: family === "bold" ? "FEED_PORTRAIT" : "FEED_SQUARE",
        brandKit,
        content,
      });
      expect(out.png.byteLength).toBeGreaterThan(4000);
      await writeFile(
        `/opt/cursor/artifacts/screenshots/template_${family}.png`,
        out.png,
      );
    }
  }, 60000);
});
