import { generatePostLocal } from "@postpilot/ai";
import { renderPostPng } from "../src/render.js";
import { writeFile } from "fs/promises";

async function main() {
  const post = generatePostLocal({
    brand: {
      businessName: "Lumen Café",
      industry: "Food & Beverage",
      niche: "Specialty coffee",
      usp: "Single-origin pour-overs and calm weekday ritual.",
      wordsToUse: ["ritual", "origin", "warm"],
      wordsToAvoid: ["cheap"],
      goals: ["community"],
      audience: { pains: "Chaotic mornings", desires: "A calm daily ritual" },
      brandKit: {
        primaryColor: "#0F3D3E",
        accentColor: "#D97706",
        secondaryColor: "#E8D5B7",
        backgroundColor: "#FAF7F2",
        textColor: "#14212B",
      },
    },
    platform: "INSTAGRAM",
    format: "SINGLE_IMAGE",
    objective: "engagement",
    topic: "The 4-minute pour-over ritual that starts the day right",
    templateFamily: "bold",
  });
  console.log("quality", post.qualityScores.overall, post.selectedHook);
  const png = await renderPostPng({
    family: "bold",
    size: "FEED_PORTRAIT",
    brandKit: {
      primaryColor: "#0F3D3E",
      secondaryColor: "#E8D5B7",
      accentColor: "#D97706",
      backgroundColor: "#FAF7F2",
      textColor: "#14212B",
    },
    content: {
      businessName: "Lumen Café",
      headline: post.headline,
      body: post.selectedHook,
      cta: post.cta,
      badge: "Specialty coffee",
    },
  });
  await writeFile("/opt/cursor/artifacts/screenshots/generated_post_bold.png", png.png);
  console.log("png bytes", png.png.byteLength);
  for (const family of ["luxury", "quote", "stat", "tip"] as const) {
    const out = await renderPostPng({
      family,
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
        cta: "Save this",
        badge: "Lumen",
        statValue: "4m",
        statLabel: "to a better morning",
      },
    });
    await writeFile(`/opt/cursor/artifacts/screenshots/template_${family}.png`, out.png);
    console.log(family, out.png.byteLength);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
