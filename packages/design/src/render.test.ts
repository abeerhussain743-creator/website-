import { describe, expect, it } from "vitest";
import { renderPostPng } from "./render.js";

describe("renderPostPng", () => {
  it("renders a bold template to png", async () => {
    const result = await renderPostPng({
      family: "bold",
      size: "FEED_SQUARE",
      brandKit: {
        primaryColor: "#0F3D3E",
        secondaryColor: "#E8D5B7",
        accentColor: "#D97706",
        backgroundColor: "#FAF7F2",
        textColor: "#14212B",
      },
      content: {
        businessName: "Lumen Café",
        headline: "Start with the ritual, not the hustle.",
        body: "A calm pour-over beats a chaotic morning.",
        cta: "Save this ritual",
        badge: "Specialty coffee",
      },
    });
    expect(result.png.byteLength).toBeGreaterThan(5000);
    expect(result.width).toBe(1080);
    expect(result.height).toBe(1080);
  }, 30000);
});
