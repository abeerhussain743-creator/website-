import { describe, expect, it } from "vitest";
import { generatePostLocal } from "./generate-post.js";

describe("generatePostLocal", () => {
  it("returns a scored premium post", () => {
    const post = generatePostLocal({
      brand: {
        businessName: "Lumen Café",
        industry: "Food & Beverage",
        niche: "Specialty coffee",
        usp: "Single-origin pour-overs and calm weekday ritual.",
        wordsToUse: ["ritual", "origin", "warm"],
        wordsToAvoid: ["cheap"],
        goals: ["community"],
        audience: {
          pains: "Chaotic mornings",
          desires: "A calm daily ritual",
        },
        brandKit: {
          primaryColor: "#0F3D3E",
          accentColor: "#D97706",
        },
      },
      platform: "INSTAGRAM",
      format: "SINGLE_IMAGE",
      objective: "engagement",
      topic: "The 4-minute pour-over ritual that starts the day right",
    });

    expect(post.selectedHook.length).toBeGreaterThan(10);
    expect(post.caption.length).toBeGreaterThan(40);
    expect(post.hashtags.length).toBeGreaterThan(2);
    expect(post.qualityScores.overall).toBeGreaterThan(50);
    expect(post.templateFamily).toBeTruthy();
  });
});
